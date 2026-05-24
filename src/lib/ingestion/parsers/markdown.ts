import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { parseHtmlToNormalized } from "./html";
import type { DocumentParser, NormalizedDocument, ParseOptions } from "./types";

export class MarkdownParser implements DocumentParser {
  canParse(mime: string, filename: string): boolean {
    const f = filename.toLowerCase();
    return mime === "text/markdown" || f.endsWith(".md") || f.endsWith(".markdown");
  }

  async parse(buffer: Buffer, _opts: ParseOptions): Promise<NormalizedDocument> {
    const md = buffer.toString("utf-8");
    const html = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(md);
    const doc = parseHtmlToNormalized(String(html));
    return { ...doc, format: "MD" };
  }
}
