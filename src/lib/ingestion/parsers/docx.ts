import mammoth from "mammoth";

import { parseHtmlToNormalized } from "./html";
import type { DocumentParser, NormalizedDocument, ParseOptions } from "./types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class DocxParser implements DocumentParser {
  canParse(mime: string, filename: string): boolean {
    return mime === DOCX_MIME || filename.toLowerCase().endsWith(".docx");
  }

  async parse(buffer: Buffer, _opts: ParseOptions): Promise<NormalizedDocument> {
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const doc = parseHtmlToNormalized(html);
    return { ...doc, format: "DOCX" };
  }
}
