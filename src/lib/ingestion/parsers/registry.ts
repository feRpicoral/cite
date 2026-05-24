import { DocxParser } from "./docx";
import { HtmlParser } from "./html";
import { MarkdownParser } from "./markdown";
import { PdfParser } from "./pdf";
import type { DocumentParser } from "./types";

const PARSERS: DocumentParser[] = [
  new PdfParser(),
  new DocxParser(),
  new MarkdownParser(),
  new HtmlParser(),
];

export function pickParser(mime: string, filename: string): DocumentParser {
  const match = PARSERS.find((p) => p.canParse(mime, filename));
  if (!match) {
    throw new Error(`No parser registered for mime=${mime} filename=${filename}`);
  }
  return match;
}
