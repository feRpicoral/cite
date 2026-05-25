import type { Element, Root, RootContent, Text } from "hast";
import rehypeParse from "rehype-parse";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import type { DocumentLocation } from "@/lib/ingestion/location";

import type {
  DocumentParser,
  NormalizedDocument,
  NormalizedPart,
  ParseOptions,
  TextSegment,
} from "./types";

const SECTION_HEADINGS = new Set(["h1", "h2", "h3"]);
const BLOCK_TAGS = new Set([
  "p",
  "li",
  "blockquote",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "td",
  "th",
]);

export class HtmlParser implements DocumentParser {
  canParse(mime: string, filename: string): boolean {
    return mime === "text/html" || filename.toLowerCase().endsWith(".html");
  }

  async parse(buffer: Buffer, _opts: ParseOptions): Promise<NormalizedDocument> {
    const html = buffer.toString("utf-8");
    return parseHtmlToNormalized(html);
  }
}

/**
 * Shared with the DOCX parser, which converts to HTML upstream and then
 * funnels through the same section-split + segment-extract path.
 */
export function parseHtmlToNormalized(html: string): NormalizedDocument {
  const tree = unified().use(rehypeParse, { fragment: true }).parse(html) as Root;
  const sanitized = unified().use(rehypeSanitize).runSync(tree) as Root;

  const sectionRoots = splitIntoSections(sanitized);

  const parts: NormalizedPart[] = sectionRoots.map((section, index) => {
    const body = unified()
      .use(rehypeStringify)
      .stringify({ type: "root", children: section.nodes });
    const segments = extractSegments(section.nodes, "div", index);
    return {
      index,
      body,
      metadata: { kind: "html" as const, heading: section.heading },
      segments,
    };
  });

  return { format: "HTML", parts };
}

interface Section {
  nodes: RootContent[];
  heading: string | null;
}

function splitIntoSections(tree: Root): Section[] {
  const sections: Section[] = [];
  let current: Section = { nodes: [], heading: null };

  for (const child of tree.children) {
    if (child.type === "element" && SECTION_HEADINGS.has(child.tagName)) {
      if (current.nodes.length > 0 || current.heading) sections.push(current);
      current = { nodes: [child], heading: extractText(child) };
    } else {
      current.nodes.push(child);
    }
  }
  if (current.nodes.length > 0) sections.push(current);
  if (sections.length === 0) {
    sections.push({ nodes: tree.children, heading: null });
  }
  return sections;
}

/**
 * Walks a section's nodes and emits one TextSegment per block-level
 * element (p, li, h1, etc). Each segment's selector pins it to a stable
 * structural path the viewer can resolve at click time, scoped to the
 * part via partIndex.
 */
function extractSegments(nodes: RootContent[], basePath: string, partIndex: number): TextSegment[] {
  const out: TextSegment[] = [];
  const counters = new Map<string, number>();

  for (const node of nodes) {
    walkBlock(node, basePath, counters, partIndex, out);
  }
  return out;
}

function walkBlock(
  node: RootContent,
  parentPath: string,
  counters: Map<string, number>,
  partIndex: number,
  out: TextSegment[],
): void {
  if (node.type !== "element") return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const n = (counters.get(tag) ?? 0) + 1;
  counters.set(tag, n);
  const selector = `${parentPath} > ${tag}:nth-of-type(${n})`;

  if (BLOCK_TAGS.has(tag)) {
    const text = extractText(el);
    if (text.length > 0) {
      const location: DocumentLocation = {
        kind: "html",
        partIndex,
        selector,
        charStart: 0,
        charEnd: text.length,
      };
      out.push({ text, location });
    }
    return;
  }

  const childCounters = new Map<string, number>();
  for (const child of el.children) {
    walkBlock(child as RootContent, selector, childCounters, partIndex, out);
  }
}

function extractText(node: Element | Text | RootContent): string {
  if (node.type === "text") return (node as Text).value;
  if (node.type !== "element") return "";
  const el = node as Element;
  let out = "";
  for (const child of el.children) {
    out += extractText(child as Element | Text | RootContent);
  }
  return out.replace(/\s+/g, " ").trim();
}
