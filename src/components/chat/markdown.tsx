"use client";

import type { Element, Root, Text } from "hast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { InitialCitation } from "@/app/(app)/conversations/[id]/chat-panel";
import { CitationChip } from "@/components/chat/citation-chip";

const CITATION_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

// Splits `[n]` / `[n, m]` markers in text nodes into <cite> elements so
// react-markdown renders them as interactive citation chips.
function rehypeCitations() {
  return (tree: Root) => walk(tree);
}

function walk(node: Root | Element): void {
  if (!node.children) return;
  const next: (Element | Text)[] = [];
  for (const child of node.children as (Element | Text)[]) {
    if (child.type === "text" && child.value.includes("[")) {
      next.push(...splitCitations(child.value));
    } else {
      if (child.type === "element") walk(child);
      next.push(child);
    }
  }
  node.children = next;
}

function splitCitations(value: string): (Element | Text)[] {
  const out: (Element | Text)[] = [];
  let cursor = 0;
  CITATION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_RE.exec(value)) !== null) {
    if (m.index > cursor) out.push({ type: "text", value: value.slice(cursor, m.index) });
    out.push({ type: "element", tagName: "cite", properties: { dataIndices: m[1] }, children: [] });
    cursor = m.index + m[0].length;
  }
  if (cursor < value.length) out.push({ type: "text", value: value.slice(cursor) });
  return out;
}

export function Markdown({
  text,
  citations,
  pending,
}: {
  text: string;
  citations: InitialCitation[];
  pending: boolean;
}) {
  return (
    <div className="cite-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeCitations]}
        components={{
          cite: ({ node }) => {
            const raw = (node?.properties?.dataIndices as string | undefined) ?? "";
            const numbers = raw
              .split(",")
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n));
            return (
              <span className="inline-flex flex-wrap gap-0.5 align-baseline">
                {numbers.map((n, i) => {
                  const citation = citations.find((c) => c.displayIndex === n);
                  return (
                    <CitationChip
                      key={`${n}-${i}`}
                      displayIndex={n}
                      citation={citation ?? undefined}
                      pending={pending}
                    />
                  );
                })}
              </span>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
