import { describe, expect, it } from "vitest";

import { pickParser } from "./registry";

describe("pickParser", () => {
  const allowListed: Array<{ mime: string; filename: string }> = [
    { mime: "application/pdf", filename: "doc.pdf" },
    {
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: "doc.docx",
    },
    { mime: "text/html", filename: "doc.html" },
    { mime: "text/markdown", filename: "doc.md" },
    { mime: "text/plain", filename: "doc.txt" },
  ];

  it.each(allowListed)("resolves a parser for allow-listed mime $mime", ({ mime, filename }) => {
    expect(() => pickParser(mime, filename)).not.toThrow();
  });
});
