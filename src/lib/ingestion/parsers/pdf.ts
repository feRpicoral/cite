import { optionalEnv } from "@/lib/env";
import type { DocumentLocation } from "@/lib/ingestion/location";

import type {
  DocumentParser,
  NormalizedDocument,
  NormalizedPart,
  ParseOptions,
  TextSegment,
} from "./types";

const API_BASE = "https://api.cloud.llamaindex.ai/api/v1/parsing";
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 300; // 10 minutes

/**
 * LlamaParse-backed PDF parser. Requires LLAMA_CLOUD_API_KEY.
 *
 * Uses direct REST calls because the official Node SDKs ship ESM-incompatible
 * directory imports that break the Next.js bundler.
 *
 * Each page's `items` (paragraphs, headings, tables, lists with bounding
 * boxes) becomes one TextSegment, preserving the citation→region mapping.
 */
export class PdfParser implements DocumentParser {
  canParse(mime: string, filename: string): boolean {
    return mime === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  }

  async parse(buffer: Buffer, opts: ParseOptions): Promise<NormalizedDocument> {
    const apiKey = optionalEnv("LLAMA_CLOUD_API_KEY");
    if (!apiKey) {
      throw new Error(
        "LLAMA_CLOUD_API_KEY is not set; configure it in .env.local before ingesting PDFs.",
      );
    }

    const jobId = await uploadJob(apiKey, buffer, opts.filename, opts.mimeType);
    await waitForJob(apiKey, jobId);
    const result = await fetchJsonResult(apiKey, jobId);

    const parts: NormalizedPart[] = result.pages.map((page, index) => {
      const items = page.items ?? [];
      const segments: TextSegment[] = [];
      let cursor = 0;
      const bodyParts: string[] = [];

      for (const item of items) {
        const text = (item.md ?? item.value ?? "").trim();
        if (!text) continue;
        const bbox = pickBbox(item);
        const charStart = cursor;
        const charEnd = cursor + text.length;
        const location: DocumentLocation = {
          kind: "pdf",
          page: index,
          charStart,
          charEnd,
          bbox,
        };
        segments.push({ text, location });
        bodyParts.push(text);
        cursor = charEnd + 1;
      }

      return {
        index,
        body: bodyParts.join("\n"),
        metadata: {
          kind: "pdf",
          pageNumber: index + 1,
          width: Number(page.width ?? 0),
          height: Number(page.height ?? 0),
          rotation: Number(page.rotation ?? 0),
        },
        segments,
      };
    });

    return { format: "PDF", pageCount: parts.length, parts };
  }
}

async function uploadJob(
  apiKey: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  form.append("parse_mode", "parse_page_with_agent");

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`LlamaParse upload failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function waitForJob(apiKey: string, jobId: string): Promise<void> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const res = await fetch(`${API_BASE}/job/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`LlamaParse status check failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { status: string; error_message?: string };
    if (body.status === "SUCCESS") return;
    if (body.status === "ERROR" || body.status === "CANCELLED") {
      throw new Error(`LlamaParse job ${body.status}: ${body.error_message ?? "no detail"}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("LlamaParse job timed out");
}

async function fetchJsonResult(apiKey: string, jobId: string): Promise<JsonResult> {
  const res = await fetch(`${API_BASE}/job/${jobId}/result/json`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`LlamaParse result fetch failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as JsonResult;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface JsonResult {
  pages: PageRaw[];
}

interface PageRaw {
  items?: PageItem[];
  width?: number;
  height?: number;
  rotation?: number;
}

interface PageItem {
  md?: string;
  value?: string;
  bBox?: { x: number; y: number; w: number; h: number };
  bbox?: [number, number, number, number] | { x0: number; y0: number; x1: number; y1: number };
}

function pickBbox(item: PageItem): [number, number, number, number] {
  if (Array.isArray(item.bbox) && item.bbox.length === 4) {
    return item.bbox;
  }
  if (item.bbox && typeof item.bbox === "object" && "x0" in item.bbox) {
    return [item.bbox.x0, item.bbox.y0, item.bbox.x1, item.bbox.y1];
  }
  if (item.bBox) {
    const { x, y, w, h } = item.bBox;
    return [x, y, x + w, y + h];
  }
  return [0, 0, 0, 0];
}
