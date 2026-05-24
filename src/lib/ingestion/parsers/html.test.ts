import { describe, expect, it } from "vitest";

import { HtmlParser } from "./html";

describe("HtmlParser", () => {
  const parser = new HtmlParser();

  it("emits segments for paragraphs and list items", async () => {
    const html = `<h1>Title</h1><p>Body one.</p><ul><li>Item A</li><li>Item B</li></ul>`;
    const doc = await parser.parse(Buffer.from(html), {
      filename: "doc.html",
      mimeType: "text/html",
    });

    const allSegments = doc.parts.flatMap((p) => p.segments);
    const texts = allSegments.map((s) => s.text);
    expect(texts).toContain("Title");
    expect(texts).toContain("Body one.");
    expect(texts).toContain("Item A");
    expect(texts).toContain("Item B");
  });

  it("strips disallowed tags via sanitization", async () => {
    const html = `<p>Safe content.</p><script>alert(1)</script>`;
    const doc = await parser.parse(Buffer.from(html), {
      filename: "doc.html",
      mimeType: "text/html",
    });

    const bodies = doc.parts.map((p) => p.body).join("");
    expect(bodies).not.toContain("<script>");
    expect(bodies).toContain("Safe content.");
  });

  it("collapses whitespace in extracted text", async () => {
    const html = `<p>  Multiple    spaces\n  and newlines  </p>`;
    const doc = await parser.parse(Buffer.from(html), {
      filename: "doc.html",
      mimeType: "text/html",
    });

    const seg = doc.parts[0]?.segments[0];
    expect(seg?.text).toBe("Multiple spaces and newlines");
  });
});
