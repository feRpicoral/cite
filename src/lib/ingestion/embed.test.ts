import { describe, expect, it } from "vitest";

import { countTokens } from "./chunk";
import { planBatches } from "./embed";

const MAX_BATCH_ITEMS = 128;
const MAX_BATCH_TOKENS = 100_000;

function batchTokens(batch: string[]): number {
  return batch.reduce((n, text) => n + countTokens(text), 0);
}

describe("planBatches", () => {
  it("returns no batches for empty input", () => {
    expect(planBatches([])).toEqual([]);
  });

  it("keeps small inputs in a single batch", () => {
    const texts = Array.from({ length: 10 }, (_, i) => `chunk ${i}`);

    const batches = planBatches(texts);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual(texts);
  });

  it("caps each batch at the item limit", () => {
    const texts = Array.from({ length: MAX_BATCH_ITEMS * 2 + 5 }, (_, i) => `chunk ${i}`);

    const batches = planBatches(texts);

    expect(batches).toHaveLength(3);
    for (const batch of batches) {
      expect(batch.length).toBeLessThanOrEqual(MAX_BATCH_ITEMS);
    }
    expect(batches.flat()).toEqual(texts);
  });

  it("splits when cumulative tokens would exceed the token cap", () => {
    const heavy = "lorem ipsum dolor sit amet ".repeat(14000);
    expect(countTokens(heavy)).toBeGreaterThan(MAX_BATCH_TOKENS / 2);
    expect(countTokens(heavy)).toBeLessThan(MAX_BATCH_TOKENS);
    const texts = Array.from({ length: 4 }, () => heavy);

    const batches = planBatches(texts);

    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      expect(batchTokens(batch)).toBeLessThanOrEqual(MAX_BATCH_TOKENS);
    }
    expect(batches.flat()).toEqual(texts);
  });

  it("isolates a single input that alone exceeds the token cap", () => {
    const giant = "token ".repeat(MAX_BATCH_TOKENS + 1000);
    expect(countTokens(giant)).toBeGreaterThan(MAX_BATCH_TOKENS);

    const batches = planBatches(["small", giant, "small"]);

    expect(batches).toEqual([["small"], [giant], ["small"]]);
  });

  it("preserves input order across batches", () => {
    const texts = Array.from({ length: MAX_BATCH_ITEMS + 50 }, (_, i) => `chunk ${i}`);

    const batches = planBatches(texts);

    expect(batches.flat()).toEqual(texts);
  });
});
