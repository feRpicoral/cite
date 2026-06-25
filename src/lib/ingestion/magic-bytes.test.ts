import { describe, expect, it } from "vitest";

import { matchesDeclaredType } from "./magic-bytes";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("matchesDeclaredType", () => {
  it("accepts a pdf payload that starts with %PDF", () => {
    const buffer = Buffer.from("%PDF-1.7\n...");

    expect(matchesDeclaredType("application/pdf", buffer)).toBe(true);
  });

  it("rejects a pdf-declared payload without the %PDF signature", () => {
    const buffer = Buffer.from("PK\x03\x04");

    expect(matchesDeclaredType("application/pdf", buffer)).toBe(false);
  });

  it("accepts a docx payload that starts with the PK zip signature", () => {
    const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);

    expect(matchesDeclaredType(DOCX_MIME, buffer)).toBe(true);
  });

  it("rejects a docx-declared payload without the PK signature", () => {
    const buffer = Buffer.from("%PDF-1.7");

    expect(matchesDeclaredType(DOCX_MIME, buffer)).toBe(false);
  });

  it("passes text-family formats through without a signature check", () => {
    const buffer = Buffer.from("# heading\n");

    expect(matchesDeclaredType("text/markdown", buffer)).toBe(true);
    expect(matchesDeclaredType("text/plain", buffer)).toBe(true);
    expect(matchesDeclaredType("text/html", buffer)).toBe(true);
  });
});
