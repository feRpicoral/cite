import { describe, expect, it, vi } from "vitest";

import { asCollectionId, asOrgId } from "@/lib/db/types";
import type { RetrievedChunk } from "@/lib/retrieval/types";

import { runAgent } from "./runner";

function chunk(id: string, score: number): RetrievedChunk {
  return {
    chunkId: id,
    documentId: "d",
    documentName: "doc",
    text: "t",
    location: { kind: "html", selector: "div", charStart: 0, charEnd: 1 },
    score,
  };
}

const orgId = asOrgId("00000000-0000-0000-0000-000000000001");
const collectionId = asCollectionId("00000000-0000-0000-0000-000000000002");

describe("runAgent", () => {
  it("runs a simple-shape query through one retrieval round", async () => {
    const retrieverOverride = vi.fn().mockResolvedValue([chunk("a", 0.9), chunk("b", 0.8)]);
    const classify = vi.fn().mockResolvedValue({ shape: "simple", reasoning: "" });
    const decompose = vi.fn();
    const sufficiency = vi.fn().mockResolvedValue({ verdict: "sufficient", reasoning: "" });

    const state = await runAgent({
      orgId,
      collectionId,
      query: "what is X",
      retrieverOverride,
      llmOverride: { classify, decompose, sufficiency },
    });

    expect(state.classify?.shape).toBe("simple");
    expect(state.subQueries).toEqual(["what is X"]);
    expect(state.rounds).toHaveLength(1);
    expect(state.finalChunks).toHaveLength(2);
    expect(decompose).not.toHaveBeenCalled();
    expect(retrieverOverride).toHaveBeenCalledOnce();
  });

  it("decomposes a multi-part query and retrieves per sub-query", async () => {
    const retrieverOverride = vi
      .fn()
      .mockResolvedValueOnce([chunk("a", 0.9)])
      .mockResolvedValueOnce([chunk("b", 0.8)]);
    const classify = vi.fn().mockResolvedValue({ shape: "decompose", reasoning: "" });
    const decompose = vi.fn().mockResolvedValue({ subQueries: ["q1", "q2"] });
    const sufficiency = vi.fn().mockResolvedValue({ verdict: "sufficient", reasoning: "" });

    const state = await runAgent({
      orgId,
      collectionId,
      query: "compare X and Y",
      retrieverOverride,
      llmOverride: { classify, decompose, sufficiency },
    });

    expect(state.subQueries).toEqual(["q1", "q2"]);
    expect(retrieverOverride).toHaveBeenCalledTimes(2);
    expect(state.finalChunks.map((c) => c.chunkId).sort()).toEqual(["a", "b"]);
  });

  it("re-iterates when sufficiency is insufficient, capped by maxRounds", async () => {
    const retrieverOverride = vi.fn().mockResolvedValue([chunk("a", 0.5)]);
    const classify = vi.fn().mockResolvedValue({ shape: "simple", reasoning: "" });
    const sufficiency = vi
      .fn()
      .mockResolvedValueOnce({ verdict: "insufficient", reasoning: "" })
      .mockResolvedValueOnce({ verdict: "insufficient", reasoning: "" });

    const state = await runAgent({
      orgId,
      collectionId,
      query: "obscure",
      maxRounds: 2,
      retrieverOverride,
      llmOverride: { classify, sufficiency },
    });

    expect(retrieverOverride).toHaveBeenCalledTimes(2);
    expect(state.sufficiency?.verdict).toBe("insufficient");
    expect(state.rounds).toHaveLength(2);
  });

  it("dedupes chunks across sub-queries by id, keeping the higher score", async () => {
    const retrieverOverride = vi
      .fn()
      .mockResolvedValueOnce([chunk("shared", 0.7), chunk("a", 0.6)])
      .mockResolvedValueOnce([chunk("shared", 0.9), chunk("b", 0.5)]);
    const classify = vi.fn().mockResolvedValue({ shape: "decompose", reasoning: "" });
    const decompose = vi.fn().mockResolvedValue({ subQueries: ["q1", "q2"] });
    const sufficiency = vi.fn().mockResolvedValue({ verdict: "sufficient", reasoning: "" });

    const state = await runAgent({
      orgId,
      collectionId,
      query: "compare A and B",
      retrieverOverride,
      llmOverride: { classify, decompose, sufficiency },
    });

    const ids = state.finalChunks.map((c) => c.chunkId);
    expect(new Set(ids).size).toBe(ids.length);
    const shared = state.finalChunks.find((c) => c.chunkId === "shared");
    expect(shared?.score).toBe(0.9);
  });
});
