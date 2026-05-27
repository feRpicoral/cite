import { beforeEach, describe, expect, it } from "vitest";

import { rerank } from "./rerank";
import type { RetrievedChunk } from "./types";

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
});
