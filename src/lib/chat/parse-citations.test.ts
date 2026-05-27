import { describe, expect, it } from "vitest";

import { extractCitationMarkers, listCitationMarkersInOrder } from "./parse-citations";

describe("extractCitationMarkers", () => {
  it("finds single markers", () => {
    const markers = extractCitationMarkers("Answer body [1] and [2].");

    expect(markers).toEqual([1, 2]);
  });

  it("finds grouped markers like [1,2]", () => {
    const markers = extractCitationMarkers("See [1, 2, 5] for context.");

    expect(markers).toEqual([1, 2, 5]);
  });

  it("dedupes repeated markers", () => {
    const markers = extractCitationMarkers("[1] foo [1] bar [3]");

    expect(markers).toEqual([1, 3]);
  });

  it("returns empty when no markers present", () => {
    const markers = extractCitationMarkers("Plain answer with no citations.");

    expect(markers).toEqual([]);
  });

  it("ignores zero and negative numbers", () => {
    const markers = extractCitationMarkers("[0] [-1] [2]");

    expect(markers).toEqual([2]);
  });

  it("returns sorted output", () => {
    const markers = extractCitationMarkers("[5] [2] [9] [3]");

    expect(markers).toEqual([2, 3, 5, 9]);
  });
});

describe("listCitationMarkersInOrder", () => {
  it("preserves order and duplicates", () => {
    const markers = listCitationMarkersInOrder("[3] then [1] then [3]");

    expect(markers).toEqual([3, 1, 3]);
  });
});
