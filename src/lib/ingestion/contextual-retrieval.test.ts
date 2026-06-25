import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RawChunk } from "./chunk";
import type { NormalizedDocument } from "./parsers/types";

const create = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

function chunk(index: number, text: string): RawChunk {
  return {
    index,
    partIndex: 0,
    text,
    tokenCount: text.length,
    location: { kind: "html", partIndex: 0, selector: "div", charStart: 0, charEnd: text.length },
  };
}

function doc(): NormalizedDocument {
  return {
    format: "HTML",
    parts: [
      {
        index: 0,
        body: "",
        metadata: { kind: "html", heading: null },
        segments: [
          {
            text: "full text",
            location: { kind: "html", partIndex: 0, selector: "div", charStart: 0, charEnd: 9 },
          },
        ],
      },
    ],
  };
}

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("enrichChunksWithContext", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    create.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns chunks unchanged when the API key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { enrichChunksWithContext } = await import("./contextual-retrieval");
    const chunks = [chunk(0, "a")];

    const result = await enrichChunksWithContext(doc(), chunks);

    expect(result).toEqual(chunks);
    expect(create).not.toHaveBeenCalled();
  });

  it("falls back to the un-enriched chunk when a per-chunk call throws", async () => {
    create
      .mockResolvedValueOnce(textResponse("Situating sentence."))
      .mockRejectedValueOnce(new Error("haiku overloaded"));
    const { enrichChunksWithContext } = await import("./contextual-retrieval");

    const result = await enrichChunksWithContext(doc(), [chunk(0, "a"), chunk(1, "b")]);

    expect(result[0]?.contextualPreamble).toBe("Situating sentence.");
    expect(result[1]?.contextualPreamble).toBeUndefined();
    expect(result[1]?.text).toBe("b");
  });

  it("preserves input order under concurrency", async () => {
    create.mockImplementation(({ messages }: { messages: { content: string }[] }) =>
      Promise.resolve(textResponse(`ctx:${messages[0]!.content}`)),
    );
    const { enrichChunksWithContext } = await import("./contextual-retrieval");
    const chunks = Array.from({ length: 12 }, (_, i) => chunk(i, `chunk-${i}`));

    const result = await enrichChunksWithContext(doc(), chunks);

    expect(result.map((c) => c.index)).toEqual(chunks.map((c) => c.index));
    expect(result.every((c, i) => c.text === `chunk-${i}`)).toBe(true);
  });
});
