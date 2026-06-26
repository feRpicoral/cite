// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { findQuoteRange } from "./locate-text";

function container(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.replaceChildren(el);
  return el;
}

describe("findQuoteRange", () => {
  it("matches the cited text within the container", () => {
    const root = container("<p>Alpha beta gamma delta epsilon.</p>");

    const range = findQuoteRange(root, "beta gamma delta");

    expect(range).not.toBeNull();
    expect(range!.toString()).toBe("beta gamma delta");
  });

  it("strips markdown from the stored quote before matching", () => {
    const root = container("<p>Alpha beta gamma delta.</p>");

    const range = findQuoteRange(root, "## **beta** [gamma](http://x) delta");

    expect(range!.toString()).toBe("beta gamma delta");
  });

  it("matches across element boundaries with collapsed whitespace", () => {
    const root = container("<p>Alpha <strong>beta</strong>\n  gamma.</p>");

    const range = findQuoteRange(root, "alpha beta gamma");

    expect(range).not.toBeNull();
    expect(range!.toString().replace(/\s+/g, " ")).toBe("Alpha beta gamma");
  });

  it("treats literal underscores and symbols as separators on both sides", () => {
    const root = container("<p>the rate r_t increases here</p>");

    const range = findQuoteRange(root, "the rate r t increases");

    expect(range!.toString()).toBe("the rate r_t increases");
  });

  it("falls back to a shorter prefix when the full quote diverges", () => {
    const text = "The quick brown fox jumps over the lazy dog and runs.";
    const root = container(`<p>${text}</p>`);

    const range = findQuoteRange(
      root,
      "The quick brown fox jumps over the lazy dog and runs far beyond the meadow into the forest.",
    );

    expect(range).not.toBeNull();
    expect(text.startsWith(range!.toString())).toBe(true);
  });

  it("returns null when the quote is shorter than the match floor", () => {
    const root = container("<p>Alpha beta gamma.</p>");

    expect(findQuoteRange(root, "ab")).toBeNull();
  });

  it("returns null when the quote is absent", () => {
    const root = container("<p>Alpha beta gamma.</p>");

    expect(findQuoteRange(root, "completely unrelated wording")).toBeNull();
  });
});
