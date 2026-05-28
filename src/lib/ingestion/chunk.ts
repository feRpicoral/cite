import { encodingForModel, type Tiktoken } from "js-tiktoken";

import type { DocumentLocation } from "@/lib/ingestion/location";

import type { NormalizedDocument, NormalizedPart, TextSegment } from "./parsers/types";

const TARGET_TOKENS = 800;
const MAX_TOKENS = 1500;
const OVERLAP_TOKENS = 100;

// gpt-4o tokenizer is close enough to most embedding tokenizers for sizing
// decisions; the actual provider's count is recomputed at embed time.
let _enc: Tiktoken | null = null;
function enc(): Tiktoken {
  _enc ??= encodingForModel("gpt-4o");
  return _enc;
}

export function countTokens(text: string): number {
  return enc().encode(text).length;
}

export interface RawChunk {
  /** Document-wide ordinal. */
  index: number;
  /** 0-based index of the source DocumentPart (matches NormalizedPart.index). */
  partIndex: number;
  text: string;
  tokenCount: number;
  /** Union of every segment location this chunk spans. */
  location: DocumentLocation;
}

/**
 * Layout-aware chunker. Walks parts in order; within each part, greedy-packs
 * segments into chunks of ~TARGET_TOKENS, never exceeding MAX_TOKENS. Each
 * chunk inherits the union of segment locations it covers (so the citation
 * can highlight the full span).
 *
 * Overlap is per-chunk (last OVERLAP_TOKENS of the previous chunk are
 * prepended to the next when both are in the same part). This is cheap
 * insurance against retrieval misses on boundary content.
 */
export function chunkDocument(doc: NormalizedDocument): RawChunk[] {
  const out: RawChunk[] = [];
  let globalIndex = 0;

  for (const part of doc.parts) {
    const partChunks = chunkPart(part);
    for (const c of partChunks) {
      out.push({ ...c, index: globalIndex++ });
    }
  }
  return out;
}

interface PendingChunk {
  partIndex: number;
  pieces: TextSegment[];
  tokenCount: number;
}

function chunkPart(part: NormalizedPart): Omit<RawChunk, "index">[] {
  if (part.segments.length === 0) return [];

  const out: Omit<RawChunk, "index">[] = [];
  let pending: PendingChunk | null = null;

  for (const seg of part.segments) {
    const segTokens = countTokens(seg.text);

    if (!pending) {
      pending = { partIndex: part.index, pieces: [seg], tokenCount: segTokens };
      continue;
    }

    // If adding this segment overflows, finalize and start a new chunk
    // (with token-budgeted overlap from the previous one).
    if (pending.tokenCount + segTokens > MAX_TOKENS) {
      out.push(finalize(pending));
      const overlap = takeOverlap(pending.pieces);
      pending = {
        partIndex: part.index,
        pieces: overlap.length > 0 ? [...overlap, seg] : [seg],
        tokenCount: overlap.reduce((n, s) => n + countTokens(s.text), 0) + segTokens,
      };
      continue;
    }

    pending.pieces.push(seg);
    pending.tokenCount += segTokens;

    // Eagerly finalize once we've reached the target so chunks stay reasonably
    // sized; the MAX guard above is just a hard ceiling.
    if (pending.tokenCount >= TARGET_TOKENS) {
      out.push(finalize(pending));
      pending = null;
    }
  }

  if (pending) out.push(finalize(pending));
  return out;
}

function finalize(c: PendingChunk): Omit<RawChunk, "index"> {
  const text = c.pieces.map((p) => p.text).join("\n\n");
  return {
    partIndex: c.partIndex,
    text,
    tokenCount: countTokens(text),
    location: unionLocation(c.pieces.map((p) => p.location)),
  };
}

function takeOverlap(prev: TextSegment[]): TextSegment[] {
  const out: TextSegment[] = [];
  let tokens = 0;
  for (let i = prev.length - 1; i >= 0; i--) {
    const seg = prev[i]!;
    const t = countTokens(seg.text);
    if (tokens + t > OVERLAP_TOKENS && out.length > 0) break;
    out.unshift(seg);
    tokens += t;
  }
  return out;
}

/**
 * Folds a list of segment locations into a single citation region:
 *   - PDF: assumes all segments are on the same page. Keeps the per-segment
 *     bboxes intact (so the viewer can highlight each paragraph individually
 *     instead of one page-spanning union box) and stores their union for
 *     coarse anchoring (scroll-into-view, region comments).
 *   - HTML: takes the shortest common ancestor selector; char span is the
 *     min..max of the contained segments. When segments live under different
 *     parents the selector falls back to the first segment's selector — the
 *     viewer will degrade gracefully (highlight the first block).
 */
export function unionLocation(locs: DocumentLocation[]): DocumentLocation {
  const first = locs[0];
  if (!first) throw new Error("unionLocation called with empty array");
  if (first.kind === "pdf") {
    const pdfs = locs as Extract<DocumentLocation, { kind: "pdf" }>[];
    const bboxes = pdfs.flatMap((p) => p.bboxes ?? [p.bbox]);
    return {
      kind: "pdf",
      page: pdfs[0]!.page,
      charStart: Math.min(...pdfs.map((p) => p.charStart)),
      charEnd: Math.max(...pdfs.map((p) => p.charEnd)),
      bbox: bboxes.reduce<[number, number, number, number]>(
        (acc, b) => [
          Math.min(acc[0], b[0]),
          Math.min(acc[1], b[1]),
          Math.max(acc[2], b[2]),
          Math.max(acc[3], b[3]),
        ],
        [Infinity, Infinity, -Infinity, -Infinity],
      ),
      bboxes,
    };
  }
  const htmls = locs as Extract<DocumentLocation, { kind: "html" }>[];
  return {
    kind: "html",
    // All chunked segments are guaranteed to come from the same part by the
    // chunker (chunkPart processes one part at a time).
    partIndex: htmls[0]!.partIndex,
    selector: commonSelectorPrefix(htmls.map((h) => h.selector)),
    charStart: Math.min(...htmls.map((h) => h.charStart)),
    charEnd: Math.max(...htmls.map((h) => h.charEnd)),
  };
}

function commonSelectorPrefix(selectors: string[]): string {
  if (selectors.length === 0) return "div";
  if (selectors.length === 1) return selectors[0]!;
  const segs = selectors.map((s) => s.split(" > "));
  const min = Math.min(...segs.map((s) => s.length));
  const prefix: string[] = [];
  for (let i = 0; i < min; i++) {
    const target = segs[0]![i];
    if (segs.every((s) => s[i] === target)) prefix.push(target!);
    else break;
  }
  return prefix.length > 0 ? prefix.join(" > ") : (selectors[0] ?? "div");
}
