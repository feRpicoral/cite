/**
 * Converts a bbox in PDF point space `[x0, y0, x1, y1]` to a viewport-space
 * `{ left, top, width, height }` rectangle that absolute-positioned
 * highlights can use.
 *
 * PDF.js's `PageViewport.viewBox` is `[x0, y0, x1, y1]` in PDF user space
 * with y-up, while the canvas is y-down. The `convertToViewportRectangle`
 * helper does the math but we wrap it for readability and to stay decoupled
 * from PDF.js internals at the call site.
 */
export interface PageViewport {
  width: number;
  height: number;
  scale: number;
  // PDF.js returns number[] here; we read it as a 4-tuple. Wrapping the type
  // in our own interface keeps the call site decoupled from pdfjs-dist
  // imports.
  convertToViewportRectangle(rect: number[]): number[];
}

export interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function bboxToViewportRect(
  bbox: [number, number, number, number],
  viewport: PageViewport,
): ViewportRect {
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = viewport.convertToViewportRectangle([...bbox]);
  return {
    left: Math.min(x0, x1),
    top: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  };
}
