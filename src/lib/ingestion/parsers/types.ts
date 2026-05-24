import type { DocumentFormat } from "@prisma/client";

import type { DocumentLocation } from "@/lib/ingestion/location";

/**
 * One atomic text segment produced by a parser, with everything the chunker
 * needs to assemble overlapping chunks while preserving citation regions.
 *
 * The chunker reads `segments` in order and joins them on `text`, tracking
 * char offsets so each emitted chunk knows the union of segment locations it
 * covers.
 */
export interface TextSegment {
  text: string;
  location: DocumentLocation;
}

/**
 * One coarse section of the document (a PDF page or an HTML-family section).
 * Stored in the DB as a `DocumentPart`. Carries enough metadata for the
 * viewer to render this part alone (preserved HTML body for HTML-family,
 * raw text for PDF) and to debug the parse if something goes wrong.
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

/** Format-agnostic output every parser produces. */
export interface NormalizedDocument {
  format: DocumentFormat;
  pageCount?: number;
  parts: NormalizedPart[];
}

export interface DocumentParser {
  /** True if this parser can handle the given MIME type or file extension. */
  canParse(mime: string, filename: string): boolean;
  /** Returns the normalized document. Throws on unrecoverable extraction failure. */
  parse(buffer: Buffer, opts: ParseOptions): Promise<NormalizedDocument>;
}

export interface ParseOptions {
  /** Original filename, used by some parsers (e.g., file-extension fallback). */
  filename: string;
  /** MIME type as reported at upload time. */
  mimeType: string;
}
