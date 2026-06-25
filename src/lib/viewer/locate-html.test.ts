// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { locateHtmlRange, rangeToHtmlLocation } from "./locate-html";

function buildRoot(partBodies: string[]): HTMLElement {
  const root = document.createElement("article");
  partBodies.forEach((body, index) => {
    const section = document.createElement("section");
    section.setAttribute("data-part-index", String(index));
    section.innerHTML = body;
    root.appendChild(section);
  });
  document.body.replaceChildren(root);
  return root;
}

describe("locateHtmlRange", () => {
  it("resolves a parser-style :scope selector against the rendered section", () => {
    const root = buildRoot(["<p>Alpha beta gamma.</p><p>Second paragraph.</p>"]);

    const range = locateHtmlRange(
      root,
      0,
      ":scope > p:nth-of-type(2)",
      0,
      "Second paragraph.".length,
    );

    expect(range).not.toBeNull();
    expect(range!.toString()).toBe("Second paragraph.");
  });

  it("selects a sub-span inside the located block", () => {
    const root = buildRoot(["<p>Alpha beta gamma.</p>"]);

    const range = locateHtmlRange(root, 0, ":scope > p:nth-of-type(1)", 6, 10);

    expect(range!.toString()).toBe("beta");
  });

  it("returns null when the selector resolves to nothing", () => {
    const root = buildRoot(["<p>Only one.</p>"]);

    const range = locateHtmlRange(root, 0, ":scope > p:nth-of-type(5)", 0, 4);

    expect(range).toBeNull();
  });

  it("returns null when the part index is absent", () => {
    const root = buildRoot(["<p>Only one.</p>"]);

    const range = locateHtmlRange(root, 9, ":scope > p:nth-of-type(1)", 0, 4);

    expect(range).toBeNull();
  });
});

describe("rangeToHtmlLocation round-trip", () => {
  it("produces a location that locateHtmlRange resolves back to the same text", () => {
    const root = buildRoot(["<p>First block.</p><p>Target block here.</p>"]);
    const block = root.querySelector('[data-part-index="0"] > p:nth-of-type(2)')!;
    const textNode = block.firstChild as Text;
    const domRange = document.createRange();
    domRange.setStart(textNode, "Target ".length);
    domRange.setEnd(textNode, "Target block".length);

    const loc = rangeToHtmlLocation(root, domRange);

    expect(loc).not.toBeNull();
    expect(loc!.selector).toBe(":scope > p:nth-of-type(2)");
    const resolved = locateHtmlRange(
      root,
      loc!.partIndex,
      loc!.selector,
      loc!.charStart,
      loc!.charEnd,
    );
    expect(resolved!.toString()).toBe("block");
  });
});
