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
    const emptyOuter = rrfFuse([], 10);
    const emptyInners = rrfFuse([[], []], 10);

    expect(emptyOuter).toEqual([]);
    expect(emptyInners).toEqual([]);
  });

  it("ranks a chunk that appears in both lists above one in only one", () => {
    const lists = [
      [chunk("a"), chunk("b"), chunk("c")],
      [chunk("b"), chunk("d"), chunk("a")],
    ];

    const fused = rrfFuse(lists, 10);

    // 'b' and 'a' appear in both; 'b' is rank-1 in list 2 and rank-2 in list 1 → highest sum.
    expect(fused[0]?.chunkId).toBe("b");
    expect(fused[1]?.chunkId).toBe("a");
  });

  it("preserves rank-1 dominance when a chunk only appears once", () => {
    const lists = [[chunk("a")], [chunk("b"), chunk("c"), chunk("d")]];

    const fused = rrfFuse(lists, 10);

    // 'a' is rank-1 in list 1; 'b' is rank-1 in list 2; both should score equally
    // and lead before c/d.
    expect(
      fused
        .slice(0, 2)
        .map((c) => c.chunkId)
        .sort(),
    ).toEqual(["a", "b"]);
  });

  it("limits the output", () => {
    const lists = [[chunk("a"), chunk("b"), chunk("c"), chunk("d"), chunk("e")]];

    const fused = rrfFuse(lists, 3);

    expect(fused).toHaveLength(3);
  });

  it("output scores are the RRF sums (not the input scores)", () => {
    const lists = [[chunk("a", 99)]];

    const fused = rrfFuse(lists, 1);

    expect(fused[0]?.score).toBeCloseTo(1 / (60 + 1), 6);
  });
});
