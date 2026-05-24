import { describe, expect, it } from "vitest";

import { extractCitationMarkers, listCitationMarkersInOrder } from "./parse-citations";

describe("extractCitationMarkers", () => {
  it("finds single markers", () => {
    expect(extractCitationMarkers("Answer body [1] and [2].")).toEqual([1, 2]);
  });

  it("finds grouped markers like [1,2]", () => {
    expect(extractCitationMarkers("See [1, 2, 5] for context.")).toEqual([1, 2, 5]);
  });

  it("dedupes repeated markers", () => {
    expect(extractCitationMarkers("[1] foo [1] bar [3]")).toEqual([1, 3]);
  });

  it("returns empty when no markers present", () => {
    expect(extractCitationMarkers("Plain answer with no citations.")).toEqual([]);
  });

  it("ignores zero and negative numbers", () => {
    expect(extractCitationMarkers("[0] [-1] [2]")).toEqual([2]);
  });

  it("returns sorted output", () => {
    expect(extractCitationMarkers("[5] [2] [9] [3]")).toEqual([2, 3, 5, 9]);
  });
});

describe("listCitationMarkersInOrder", () => {
  it("preserves order and duplicates", () => {
    expect(listCitationMarkersInOrder("[3] then [1] then [3]")).toEqual([3, 1, 3]);
  });
});
