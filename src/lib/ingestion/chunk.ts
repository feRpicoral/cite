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
  index: number;
  /** 0-based index of the source DocumentPart (matches NormalizedPart.index). */
  partIndex: number;
  text: string;
  tokenCount: number;
  location: DocumentLocation;
}

/**
 * Greedy-packs each part's segments into ~TARGET_TOKENS chunks (hard cap
 * MAX_TOKENS), carrying the union of each chunk's segment locations so a
 * citation can highlight the full span. Consecutive chunks in a part overlap
 * by OVERLAP_TOKENS as insurance against retrieval misses on boundary content.
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

  const segments = part.segments.flatMap(splitOversizedSegment);
  for (const seg of segments) {
    const segTokens = countTokens(seg.text);

    if (!pending) {
      pending = { partIndex: part.index, pieces: [seg], tokenCount: segTokens };
      continue;
    }

    if (pending.tokenCount + segTokens > MAX_TOKENS) {
      out.push(finalize(pending));
      const overlap = takeOverlap(pending.pieces);
      const overlapTokens = overlap.reduce((n, s) => n + countTokens(s.text), 0);
      const keepOverlap = overlap.length > 0 && overlapTokens + segTokens <= MAX_TOKENS;
      pending = {
        partIndex: part.index,
        pieces: keepOverlap ? [...overlap, seg] : [seg],
        tokenCount: keepOverlap ? overlapTokens + segTokens : segTokens,
      };
      continue;
    }

    pending.pieces.push(seg);
    pending.tokenCount += segTokens;

    // Finalize at the soft TARGET; the MAX check above is the hard ceiling.
    if (pending.tokenCount >= TARGET_TOKENS) {
      out.push(finalize(pending));
      pending = null;
    }
  }

  if (pending) out.push(finalize(pending));
  return out;
}

/**
 * A single block can exceed MAX_TOKENS (e.g. a very long paragraph). The packer
 * never subdivides one segment, so split it here into ≤MAX_TOKENS windows on
 * whitespace boundaries, each keeping the original location so every emitted
 * chunk still points at the same block.
 */
function splitOversizedSegment(seg: TextSegment): TextSegment[] {
  // Tokenize once and slice into ≤MAX_TOKENS windows. Re-tokenizing a growing
  // buffer per word is O(n^2) and stalls on very long blocks.
  const tokenizer = enc();
  const ids = tokenizer.encode(seg.text);
  if (ids.length <= MAX_TOKENS) return [seg];

  const out: TextSegment[] = [];
  for (let i = 0; i < ids.length; i += MAX_TOKENS) {
    const text = tokenizer.decode(ids.slice(i, i + MAX_TOKENS)).trim();
    if (text) out.push({ text, location: seg.location });
  }
  return out.length > 0 ? out : [seg];
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
 *   - PDF: assumes all segments are on the same page; takes char span union
 *     and bbox bounding box.
 *   - HTML: when every segment shares one selector, char span is the min..max
 *     of the contained segments. When selectors differ, offsets can't be merged
 *     (they're block-relative), so it falls back to the first segment's full
 *     location — the viewer degrades gracefully by highlighting the first block.
 */
export function unionLocation(locs: DocumentLocation[]): DocumentLocation {
  const first = locs[0];
  if (!first) throw new Error("unionLocation called with empty array");
  if (first.kind === "pdf") {
    const pdfs = locs as Extract<DocumentLocation, { kind: "pdf" }>[];
    return {
      kind: "pdf",
      page: pdfs[0]!.page,
      charStart: Math.min(...pdfs.map((p) => p.charStart)),
      charEnd: Math.max(...pdfs.map((p) => p.charEnd)),
      bbox: pdfs.reduce<[number, number, number, number]>(
        (acc, p) => [
          Math.min(acc[0], p.bbox[0]),
          Math.min(acc[1], p.bbox[1]),
          Math.max(acc[2], p.bbox[2]),
          Math.max(acc[3], p.bbox[3]),
        ],
        [Infinity, Infinity, -Infinity, -Infinity],
      ),
    };
  }
  const htmls = locs as Extract<DocumentLocation, { kind: "html" }>[];
  const firstHtml = htmls[0]!;
  // Offsets are relative to a single block element, so unioning them is only
  // valid when every segment shares the exact same selector. Otherwise the
  // min/max offsets would index into the wrong element; degrade gracefully by
  // highlighting just the first block.
  if (!htmls.every((h) => h.selector === firstHtml.selector)) {
    return firstHtml;
  }
  return {
    kind: "html",
    partIndex: firstHtml.partIndex,
    selector: firstHtml.selector,
    charStart: Math.min(...htmls.map((h) => h.charStart)),
    charEnd: Math.max(...htmls.map((h) => h.charEnd)),
  };
}
