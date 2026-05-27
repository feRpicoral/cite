import { describe, expect, it } from "vitest";

import { chunkDocument, countTokens, unionLocation } from "./chunk";
import type { DocumentLocation } from "./location";
import type { NormalizedDocument, NormalizedPart, TextSegment } from "./parsers/types";

function htmlSeg(text: string, selector: string, partIndex: number = 0): TextSegment {
  return {
    text,
    location: { kind: "html", partIndex, selector, charStart: 0, charEnd: text.length },
  };
}

function makeDoc(parts: NormalizedPart[]): NormalizedDocument {
  return { format: "HTML", parts };
}

describe("chunkDocument", () => {
  it("returns no chunks for an empty document", () => {
    expect(chunkDocument(makeDoc([]))).toEqual([]);
  });

  it("packs small segments into one chunk when under the target", () => {
    const part: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: [htmlSeg("Hello world.", "div > p:nth-of-type(1)")],
    };
    const chunks = chunkDocument(makeDoc([part]));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe("Hello world.");
  });

  it("splits when a single part exceeds the max token budget", () => {
    const long = "Lorem ipsum dolor sit amet. ".repeat(80);
    const segs = Array.from({ length: 10 }, (_, i) =>
      htmlSeg(long, `div > p:nth-of-type(${i + 1})`),
    );
    const part: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: segs,
    };
    const chunks = chunkDocument(makeDoc([part]));
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.tokenCount).toBeLessThanOrEqual(1500);
    }
  });

  it("assigns sequential ordinals across the whole document", () => {
    const p1: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: [htmlSeg("a", "div > p:nth-of-type(1)")],
    };
    const p2: NormalizedPart = {
      index: 1,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: [htmlSeg("b", "div > p:nth-of-type(1)")],
    };
    const chunks = chunkDocument(makeDoc([p1, p2]));
    expect(chunks.map((c) => c.index)).toEqual([0, 1]);
    expect(chunks[0]?.partIndex).toBe(0);
    expect(chunks[1]?.partIndex).toBe(1);
  });

  it("location's selector is the common-ancestor when chunk covers multiple segments", () => {
    const segs = [
      htmlSeg("one", "div > section:nth-of-type(1) > p:nth-of-type(1)"),
      htmlSeg("two", "div > section:nth-of-type(1) > p:nth-of-type(2)"),
    ];
    const part: NormalizedPart = {
      index: 0,
      body: "",
      metadata: { kind: "html", heading: null },
      segments: segs,
    };
    const chunks = chunkDocument(makeDoc([part]));
    expect(chunks).toHaveLength(1);
    const loc = chunks[0]!.location;
    expect(loc.kind).toBe("html");
    if (loc.kind === "html") {
      expect(loc.selector).toBe("div > section:nth-of-type(1)");
    }
  });
});

describe("unionLocation", () => {
  it("merges PDF locations into a bounding bbox", () => {
    const locs: DocumentLocation[] = [
      { kind: "pdf", page: 3, charStart: 10, charEnd: 25, bbox: [10, 20, 50, 40] },
      { kind: "pdf", page: 3, charStart: 30, charEnd: 60, bbox: [5, 15, 60, 45] },
    ];
    const u = unionLocation(locs);
    expect(u).toEqual({
      kind: "pdf",
      page: 3,
      charStart: 10,
      charEnd: 60,
      bbox: [5, 15, 60, 45],
    });
  });

  it("merges HTML locations to common ancestor selector", () => {
    const locs: DocumentLocation[] = [
      {
        kind: "html",
        partIndex: 0,
        selector: "div > section:nth-of-type(1) > p:nth-of-type(1)",
        charStart: 0,
        charEnd: 10,
      },
      {
        kind: "html",
        partIndex: 0,
        selector: "div > section:nth-of-type(1) > p:nth-of-type(2)",
        charStart: 0,
        charEnd: 20,
      },
    ];
    const u = unionLocation(locs);
    if (u.kind !== "html") throw new Error("expected html");
    expect(u.selector).toBe("div > section:nth-of-type(1)");
  });
});

describe("countTokens", () => {
  it("returns a positive count for non-empty text", () => {
    expect(countTokens("hello world")).toBeGreaterThan(0);
  });

  it("returns 0 for empty text", () => {
    expect(countTokens("")).toBe(0);
  });
});
