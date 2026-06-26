import { describe, expect, it } from "vitest";

import { summarizeVerdicts } from "./dashboard";

describe("summarizeVerdicts", () => {
  it("counts grouped verdicts and rounds percentages", () => {
    const result = summarizeVerdicts([
      { verdict: "SUPPORTED", _count: { _all: 2 } },
      { verdict: "PARTIAL", _count: { _all: 1 } },
      { verdict: "UNSUPPORTED", _count: { _all: 1 } },
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

  it("treats a missing verdict group as zero", () => {
    const result = summarizeVerdicts([{ verdict: "SUPPORTED", _count: { _all: 3 } }]);

    expect(result).toMatchObject({ total: 3, supported: 3, partial: 0, unsupported: 0 });
    expect(result.supportedPct).toBe(100);
  });

  it("returns zero percentages for an empty set", () => {
    const result = summarizeVerdicts([]);

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
