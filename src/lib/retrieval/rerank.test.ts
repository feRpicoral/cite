import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rerank } from "./rerank";
import type { RetrievedChunk } from "./types";

function voyageResponse(rows: { index: number; relevance_score: number }[]): Response {
  return new Response(JSON.stringify({ data: rows }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function chunk(id: string, score: number): RetrievedChunk {
  return {
    chunkId: id,
    documentId: "d",
    documentName: "doc",
    text: id,
    location: { kind: "html", partIndex: 0, selector: "div", charStart: 0, charEnd: 1 },
    score,
  };
}

describe("rerank", () => {
  const prev = process.env.VOYAGE_API_KEY;
  beforeEach(() => {
    delete process.env.VOYAGE_API_KEY;
  });

  it("is a no-op slice when VOYAGE_API_KEY is missing", async () => {
    const input = [chunk("a", 3), chunk("b", 2), chunk("c", 1)];

    const out = await rerank("query", input, 2);

    expect(out).toHaveLength(2);
    expect(out.map((c) => c.chunkId)).toEqual(["a", "b"]);

    if (prev) process.env.VOYAGE_API_KEY = prev;
  });

  it("returns empty for empty input", async () => {
    const out = await rerank("q", [], 10);

    expect(out).toEqual([]);
  });

  describe("with VOYAGE_API_KEY present", () => {
    afterEach(() => {
      vi.restoreAllMocks();
      if (prev) process.env.VOYAGE_API_KEY = prev;
      else delete process.env.VOYAGE_API_KEY;
    });

    it("drops rows whose Voyage index has no backing chunk", async () => {
      process.env.VOYAGE_API_KEY = "test-key";
      const input = [chunk("a", 0), chunk("b", 0)];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        voyageResponse([
          { index: 1, relevance_score: 0.9 },
          { index: 5, relevance_score: 0.8 },
          { index: 0, relevance_score: 0.7 },
        ]),
      );

      const out = await rerank("query", input, 10);

      expect(out.map((c) => c.chunkId)).toEqual(["b", "a"]);
      expect(out.map((c) => c.score)).toEqual([0.9, 0.7]);
    });
  });
});
