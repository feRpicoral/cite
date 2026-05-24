import { describe, expect, it } from "vitest";

import { extractClaimsForMarkers } from "./judge";

describe("extractClaimsForMarkers", () => {
  it("returns the bearing sentence for each marker", () => {
    const text = "The contract expires on January 1 [1]. Renewal requires written notice [2].";
    expect(extractClaimsForMarkers(text)).toEqual([
      { displayIndex: 1, claim: "The contract expires on January 1 [1]." },
      { displayIndex: 2, claim: "Renewal requires written notice [2]." },
    ]);
  });

  it("expands [n,m] into one claim per number", () => {
    const text = "Both clauses agree [1, 2].";
    expect(extractClaimsForMarkers(text)).toEqual([
      { displayIndex: 1, claim: "Both clauses agree [1, 2]." },
      { displayIndex: 2, claim: "Both clauses agree [1, 2]." },
    ]);
  });

  it("ignores text without markers", () => {
    expect(extractClaimsForMarkers("No citations here.")).toEqual([]);
  });

  it("returns the trailing fragment when text has no terminal punctuation", () => {
    expect(extractClaimsForMarkers("trailing claim [3]")).toEqual([
      { displayIndex: 3, claim: "trailing claim [3]" },
    ]);
  });
});
