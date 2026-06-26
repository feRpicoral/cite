import { describe, expect, it } from "vitest";

import { formatBytes, isSupportedUpload, MAX_UPLOAD_BYTES } from "./upload-constraints";

function file(name: string, type: string): File {
  return new File(["x"], name, { type });
}

describe("isSupportedUpload", () => {
  it("accepts files by recognized mime type", () => {
    expect(isSupportedUpload(file("doc.pdf", "application/pdf"))).toBe(true);
    expect(isSupportedUpload(file("page.html", "text/html"))).toBe(true);
  });

  it("falls back to the extension when the browser reports no mime", () => {
    expect(isSupportedUpload(file("notes.md", ""))).toBe(true);
    expect(isSupportedUpload(file("readme.markdown", ""))).toBe(true);
    expect(isSupportedUpload(file("page.htm", ""))).toBe(true);
  });

  it("rejects unsupported formats", () => {
    expect(isSupportedUpload(file("scan.tiff", "image/tiff"))).toBe(false);
    expect(isSupportedUpload(file("archive.zip", "application/zip"))).toBe(false);
    expect(isSupportedUpload(file("noext", ""))).toBe(false);
  });
});

describe("formatBytes", () => {
  it("renders bytes, kilobytes, and megabytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(MAX_UPLOAD_BYTES)).toBe("4.5 MB");
  });
});
