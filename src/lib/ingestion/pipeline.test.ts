import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { asDocumentId, asOrgId } from "@/lib/db/types";

import type { EnrichedChunk } from "./contextual-retrieval";
import type { NormalizedDocument } from "./parsers/types";

const calls: string[] = [];

const tx = {
  documentPart: {
    deleteMany: vi.fn(() => calls.push("tx.part.deleteMany")),
    createMany: vi.fn(),
    findMany: vi.fn().mockResolvedValue([{ id: "part-0", index: 0 }]),
  },
  documentChunk: {
    deleteMany: vi.fn(() => calls.push("tx.chunk.deleteMany")),
    createMany: vi.fn(),
  },
  $executeRawUnsafe: vi.fn(),
};

const prisma = {
  document: { update: vi.fn() },
  documentPart: {
    deleteMany: vi.fn(() => calls.push("top.part.deleteMany")),
  },
  $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<void>) => {
    calls.push("tx.begin");
    await fn(tx);
    calls.push("tx.commit");
  }),
};

vi.mock("@/lib/db/client", () => ({ getPrisma: () => prisma }));
vi.mock("./embed", () => ({
  embedTexts: vi.fn(async (inputs: string[]) => {
    calls.push("embed");
    return inputs.map(() => [0.1, 0.2]);
  }),
}));
vi.mock("./contextual-retrieval", () => ({
  enrichChunksWithContext: vi.fn(async (_doc, chunks: EnrichedChunk[]) => chunks),
  buildEmbeddingInput: (chunk: EnrichedChunk) => chunk.text,
}));
vi.mock("./chunk", () => ({
  chunkDocument: () => [
    {
      index: 0,
      partIndex: 0,
      text: "chunk text",
      tokenCount: 2,
      location: { kind: "html", partIndex: 0, selector: "div", charStart: 0, charEnd: 10 },
    },
  ],
}));

function doc(): NormalizedDocument {
  return {
    format: "HTML",
    parts: [{ index: 0, body: "body", metadata: { kind: "html", heading: null }, segments: [] }],
  };
}

describe("persistStage", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
    tx.documentPart.findMany.mockResolvedValue([{ id: "part-0", index: 0 }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes existing parts inside the swap transaction, never before embedding", async () => {
    const { persistStage } = await import("./pipeline");

    await persistStage(asOrgId("org-1"), asDocumentId("doc-1"), doc());

    expect(prisma.documentPart.deleteMany).not.toHaveBeenCalled();
    expect(tx.documentPart.deleteMany).toHaveBeenCalledTimes(1);
    expect(calls.indexOf("embed")).toBeLessThan(calls.indexOf("tx.part.deleteMany"));
    expect(calls.indexOf("tx.begin")).toBeLessThan(calls.indexOf("tx.part.deleteMany"));
    expect(calls.indexOf("tx.part.deleteMany")).toBeLessThan(calls.indexOf("tx.commit"));
  });

  it("replaces parts and chunks within a single transaction", async () => {
    const { persistStage } = await import("./pipeline");

    await persistStage(asOrgId("org-1"), asDocumentId("doc-1"), doc());

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.documentChunk.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.documentChunk.createMany).toHaveBeenCalledTimes(1);
    expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });
});
