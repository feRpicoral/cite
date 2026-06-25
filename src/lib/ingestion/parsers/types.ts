import type { DocumentFormat } from "@prisma/client";

import type { DocumentLocation } from "@/lib/ingestion/location";

/** The text plus the citation location the chunker preserves while packing chunks. */
export interface TextSegment {
  text: string;
  location: DocumentLocation;
}

/**
 * One coarse section (a PDF page or HTML-family section), persisted as a
 * `DocumentPart`. `body` is the sanitized HTML the viewer renders for the part
 * (raw text for PDF).
 */
export interface NormalizedPart {
  index: number;
  body: string;
  metadata: NormalizedPartMetadata;
  segments: TextSegment[];
}

export type NormalizedPartMetadata =
  | { kind: "pdf"; pageNumber: number; width: number; height: number; rotation: number }
  | { kind: "html"; heading: string | null };

export interface NormalizedDocument {
  format: DocumentFormat;
  pageCount?: number;
  parts: NormalizedPart[];
}

export interface DocumentParser {
  canParse(mime: string, filename: string): boolean;
  /** Throws on unrecoverable extraction failure. */
  parse(buffer: Buffer, opts: ParseOptions): Promise<NormalizedDocument>;
}

export interface ParseOptions {
  /** Used by some parsers as a file-extension fallback when the MIME is ambiguous. */
  filename: string;
  mimeType: string;
}
