import { describe, expect, it } from "vitest";

import { aggregateOf } from "./aggregate";

describe("aggregateOf", () => {
  it("counts verdicts and rounds percentages", () => {
    const result = aggregateOf([
      { verdict: "SUPPORTED" },
      { verdict: "SUPPORTED" },
      { verdict: "PARTIAL" },
      { verdict: "UNSUPPORTED" },
    ]);

    expect(result).toEqual({
      total: 4,
      supported: 2,
      partial: 1,
      unsupported: 1,
      supportedPct: 50,
      partialPct: 25,
      unsupportedPct: 25,
    });
  });

  it("matches the filtered set when orphaned audits are excluded first", () => {
    const all = [
      { messageId: "kept", verdict: "SUPPORTED" as const },
      { messageId: "kept", verdict: "UNSUPPORTED" as const },
      { messageId: "orphan", verdict: "UNSUPPORTED" as const },
    ];
    const withMessage = new Set(["kept"]);

    const filtered = aggregateOf(all.filter((a) => withMessage.has(a.messageId)));

    expect(filtered.total).toBe(2);
    expect(filtered.unsupportedPct).toBe(50);
  });

  it("returns zero percentages for an empty set", () => {
    const result = aggregateOf([]);

    expect(result).toEqual({
      total: 0,
      supported: 0,
      partial: 0,
      unsupported: 0,
      supportedPct: 0,
      partialPct: 0,
      unsupportedPct: 0,
    });
  });
});
