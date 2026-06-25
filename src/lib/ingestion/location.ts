import { z } from "zod";

/**
 * Where, exactly, a piece of cited text lives in the source document.
 *
 * The discriminated union covers both spatial (PDF bbox) and structural (HTML
 * selector + offset) anchors so the viewer can dispatch to the right
 * locator + highlight overlay per format.
 *
 * Stored as a JSON column on DocumentChunk; deserialized via `parseLocation`.
 */
export type DocumentLocation =
  | {
      kind: "pdf";
      page: number;
      charStart: number;
      charEnd: number;
      bbox: [number, number, number, number];
    }
  | {
      kind: "html";
      // Index of the DocumentPart this location is scoped to. Two parts of
      // the same document can yield the same structural selector, so the
      // viewer needs to know which part wrapper to query inside.
      partIndex: number;
      selector: string;
      charStart: number;
      charEnd: number;
    };

const PdfLocation = z.object({
  kind: z.literal("pdf"),
  page: z.number().int().nonnegative(),
  charStart: z.number().int().nonnegative(),
  charEnd: z.number().int().nonnegative(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

// The viewer feeds `selector` straight into querySelector, so an arbitrary
// stored string could throw a SyntaxError and break the viewer for everyone
// opening the document. Constrain it to the structural grammar the parser
// emits (`:scope > tag:nth-of-type(n) > ...`) so a crafted comment location
// can't smuggle in a hostile selector.
const STRUCTURAL_SELECTOR = /^:scope(?: > [a-z][a-z0-9]*:nth-of-type\(\d+\))+$/;

const HtmlLocation = z.object({
  kind: z.literal("html"),
  partIndex: z.number().int().nonnegative(),
  selector: z.string().min(1).regex(STRUCTURAL_SELECTOR),
  charStart: z.number().int().nonnegative(),
  charEnd: z.number().int().nonnegative(),
});

export const DocumentLocationSchema = z.discriminatedUnion("kind", [PdfLocation, HtmlLocation]);

export function parseLocation(value: unknown): DocumentLocation {
  return DocumentLocationSchema.parse(value);
}

export function isPdfLocation(
  loc: DocumentLocation,
): loc is Extract<DocumentLocation, { kind: "pdf" }> {
  return loc.kind === "pdf";
}

export function isHtmlLocation(
  loc: DocumentLocation,
): loc is Extract<DocumentLocation, { kind: "html" }> {
  return loc.kind === "html";
}
