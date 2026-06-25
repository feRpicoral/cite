import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmbeddingValidationError, embedQuery } from "./embed-query";

const EXPECTED_DIMENSION = 2048;

function mockVoyage(embedding: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding }] }),
    }),
  );
}

describe("embedQuery validation", () => {
  beforeEach(() => {
    process.env.VOYAGE_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.VOYAGE_API_KEY;
  });

  it("returns a valid 2048-dim embedding", async () => {
    const embedding = Array.from({ length: EXPECTED_DIMENSION }, () => 0.1);
    mockVoyage(embedding);

    await expect(embedQuery("hello")).resolves.toEqual(embedding);
  });

  it("throws on a dimension mismatch", async () => {
    mockVoyage(Array.from({ length: 1024 }, () => 0.1));

    await expect(embedQuery("hello")).rejects.toBeInstanceOf(EmbeddingValidationError);
  });

  it("throws when the embedding is not an array", async () => {
    mockVoyage(null);

    await expect(embedQuery("hello")).rejects.toBeInstanceOf(EmbeddingValidationError);
  });

  it("throws when the embedding contains non-finite values", async () => {
    const embedding = Array.from({ length: EXPECTED_DIMENSION }, () => 0.1);
    embedding[5] = Number.NaN;
    mockVoyage(embedding);

    await expect(embedQuery("hello")).rejects.toBeInstanceOf(EmbeddingValidationError);
  });
});
