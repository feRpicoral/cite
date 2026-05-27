import { describe, expect, it } from "vitest";

import { rrfFuse } from "./hybrid";
import type { RetrievedChunk } from "./types";

function chunk(id: string, score: number = 0): RetrievedChunk {
  return {
    chunkId: id,
    documentId: "d",
    documentName: "doc",
    text: "t",
    location: { kind: "html", partIndex: 0, selector: "div", charStart: 0, charEnd: 1 },
    score,
  };
}

describe("rrfFuse", () => {
  it("returns empty for empty lists", () => {
    expect(rrfFuse([], 10)).toEqual([]);
    expect(rrfFuse([[], []], 10)).toEqual([]);
  });

  it("ranks a chunk that appears in both lists above one in only one", () => {
    const lists = [
      [chunk("a"), chunk("b"), chunk("c")],
      [chunk("b"), chunk("d"), chunk("a")],
    ];
    const fused = rrfFuse(lists, 10);
    expect(fused[0]?.chunkId).toBe("b");
    expect(fused[1]?.chunkId).toBe("a");
  });

  it("preserves rank-1 dominance when a chunk only appears once", () => {
    const lists = [[chunk("a")], [chunk("b"), chunk("c"), chunk("d")]];
    const fused = rrfFuse(lists, 10);
    expect(
      fused
        .slice(0, 2)
        .map((c) => c.chunkId)
        .sort(),
    ).toEqual(["a", "b"]);
  });

  it("limits the output", () => {
    const lists = [[chunk("a"), chunk("b"), chunk("c"), chunk("d"), chunk("e")]];
    expect(rrfFuse(lists, 3)).toHaveLength(3);
  });

  it("output scores are the RRF sums (not the input scores)", () => {
    const fused = rrfFuse([[chunk("a", 99)]], 1);
    expect(fused[0]?.score).toBeCloseTo(1 / (60 + 1), 6);
  });
});
