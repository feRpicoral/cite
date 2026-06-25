import { describe, expect, it } from "vitest";

import { staleDocumentsWhere, STUCK_DOCUMENT_THRESHOLD_MS } from "./reap-stuck-documents";

describe("staleDocumentsWhere", () => {
  const now = new Date("2026-06-25T12:00:00.000Z");

  it("targets only non-terminal statuses", () => {
    const where = staleDocumentsWhere(now, STUCK_DOCUMENT_THRESHOLD_MS);

    expect(where.status).toEqual({
      in: ["UPLOADING", "EXTRACTING", "CHUNKING", "EMBEDDING"],
    });
  });

  it("excludes INDEXED and FAILED from the selection", () => {
    const where = staleDocumentsWhere(now, STUCK_DOCUMENT_THRESHOLD_MS);
    const statuses = (where.status as { in: string[] }).in;

    expect(statuses).not.toContain("INDEXED");
    expect(statuses).not.toContain("FAILED");
  });

  it("cuts off at now minus the threshold", () => {
    const where = staleDocumentsWhere(now, STUCK_DOCUMENT_THRESHOLD_MS);

    expect(where.updatedAt).toEqual({
      lt: new Date("2026-06-25T11:30:00.000Z"),
    });
  });

  it("recomputes the cutoff from the supplied threshold", () => {
    const where = staleDocumentsWhere(now, 60_000);

    expect(where.updatedAt).toEqual({ lt: new Date("2026-06-25T11:59:00.000Z") });
  });
});
