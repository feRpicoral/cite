import { describe, expect, it } from "vitest";

import { MarkdownParser } from "./markdown";

describe("MarkdownParser", () => {
  const parser = new MarkdownParser();

  it("detects .md files and text/markdown mime", () => {
    expect(parser.canParse("text/markdown", "doc.md")).toBe(true);
    expect(parser.canParse("text/plain", "doc.markdown")).toBe(true);
    expect(parser.canParse("application/pdf", "doc.pdf")).toBe(false);
  });

  it("splits a document into sections at h1/h2/h3", async () => {
    const md = `# Intro\n\nIntro body.\n\n## Details\n\nDetail one.\n\nDetail two.\n\n## Pricing\n\nFree tier available.`;
    const doc = await parser.parse(Buffer.from(md), {
      filename: "doc.md",
      mimeType: "text/markdown",
    });

    expect(doc.format).toBe("MD");
    expect(doc.parts).toHaveLength(3);
    expect(doc.parts[0]?.metadata).toEqual({ kind: "html", heading: "Intro" });
    expect(doc.parts[1]?.metadata).toEqual({ kind: "html", heading: "Details" });
    expect(doc.parts[2]?.metadata).toEqual({ kind: "html", heading: "Pricing" });
  });

  it("emits one segment per block element with stable selectors", async () => {
    const md = `## A\n\nFirst para.\n\nSecond para.`;
    const doc = await parser.parse(Buffer.from(md), {
      filename: "doc.md",
      mimeType: "text/markdown",
    });

    const section = doc.parts[0]!;
    const texts = section.segments.map((s) => s.text);
    expect(texts).toContain("A");
    expect(texts).toContain("First para.");
    expect(texts).toContain("Second para.");
    for (const seg of section.segments) {
      expect(seg.location.kind).toBe("html");
      if (seg.location.kind === "html") {
        expect(seg.location.selector.length).toBeGreaterThan(0);
      }
    }
  });

  it("handles a single-section document with no headings", async () => {
    const md = `Just one paragraph.\n\nAnd another.`;
    const doc = await parser.parse(Buffer.from(md), {
      filename: "doc.md",
      mimeType: "text/markdown",
    });

    expect(doc.parts).toHaveLength(1);
    expect(doc.parts[0]?.metadata).toEqual({ kind: "html", heading: null });
  });
});
