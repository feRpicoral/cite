import { describe, expect, it } from "vitest";

import { bboxToViewportRect, type PageViewport } from "./coords";

function fakeViewport(scale = 1): PageViewport {
  return {
    width: 612 * scale,
    height: 792 * scale,
    scale,
    // Mimics PDF.js's y-flip with an identity-scaled transform so the math is checkable by hand.
    convertToViewportRectangle: (rect) => {
      const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = rect;
      return [x0 * scale, (792 - y1) * scale, x1 * scale, (792 - y0) * scale];
    },
  };
}

describe("bboxToViewportRect", () => {
  it("yields a positive-width / positive-height rect", () => {
    const viewport = fakeViewport(1);

    const r = bboxToViewportRect([100, 700, 300, 750], viewport);

    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
    expect(r.left).toBe(100);
    expect(r.top).toBe(42); // 792 - 750
    expect(r.width).toBe(200);
    expect(r.height).toBe(50);
  });

  it("scales with viewport.scale", () => {
    const viewport = fakeViewport(2);

    const r = bboxToViewportRect([100, 700, 300, 750], viewport);

    expect(r.left).toBe(200);
    expect(r.width).toBe(400);
    expect(r.height).toBe(100);
  });
});
