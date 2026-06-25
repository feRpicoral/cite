import Anthropic from "@anthropic-ai/sdk";

import { optionalEnv } from "@/lib/env";

import type { RawChunk } from "./chunk";
import type { NormalizedDocument } from "./parsers/types";

const SYSTEM_PROMPT = `You write one or two short sentences that situate a chunk of a document inside the whole document, for use as a retrieval preamble. Write only the sentences; no preface, no commentary, no quotes.`;

const MAX_DOC_CHARS = 80_000;
const ENRICHMENT_CONCURRENCY = 6;

export type EnrichedChunk = RawChunk & { contextualPreamble?: string };

/**
 * Anthropic Contextual Retrieval. For each chunk, asks Haiku to write a
 * 1-2 sentence preamble that orients the chunk within the full document.
 * The preamble is prepended at embed time only; it never appears in the
 * citation surface.
 *
 * The full document goes in a cached system prompt block, so subsequent
 * chunks for the same doc are ~free on input tokens.
 *
 * No-op (returns the chunks unchanged) when ANTHROPIC_API_KEY is missing —
 * the pipeline continues with un-augmented chunks at a quality cost.
 */
export async function enrichChunksWithContext(
  doc: NormalizedDocument,
  chunks: RawChunk[],
): Promise<EnrichedChunk[]> {
  const apiKey = optionalEnv("ANTHROPIC_API_KEY");
  if (!apiKey) return chunks;

  const client = new Anthropic({ apiKey });
  const fullText = doc.parts
    .map((p) => p.segments.map((s) => s.text).join("\n"))
    .join("\n\n")
    .slice(0, MAX_DOC_CHARS);

  return mapWithConcurrency(chunks, ENRICHMENT_CONCURRENCY, (chunk) =>
    enrichChunk(client, fullText, chunk),
  );
}

async function enrichChunk(
  client: Anthropic,
  fullText: string,
  chunk: RawChunk,
): Promise<EnrichedChunk> {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        {
          type: "text",
          text: `<document>\n${fullText}\n</document>`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `<chunk>\n${chunk.text}\n</chunk>\n\nWrite the situating sentences.`,
        },
      ],
    });

    const preamble = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((b) => b.text.trim())
      .join(" ")
      .trim();

    return preamble ? { ...chunk, contextualPreamble: preamble } : chunk;
  } catch (err) {
    // Enrichment is optional; a failed call degrades to the un-enriched chunk
    // rather than aborting the whole ingestion.
    console.error("contextual enrichment failed for chunk", chunk.index, err);
    return chunk;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const current = next++;
      results[current] = await fn(items[current]!);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export function buildEmbeddingInput(chunk: EnrichedChunk): string {
  return chunk.contextualPreamble ? `${chunk.contextualPreamble}\n\n${chunk.text}` : chunk.text;
}
