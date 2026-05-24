import "server-only";

import { optionalEnv } from "@/lib/env";

import type { RetrievedChunk } from "./types";

const ENDPOINT = "https://api.voyageai.com/v1/rerank";
const MODEL = "rerank-2.5";

/**
 * Voyage Rerank 2.5 (Phase 1 decision). Cross-encodes (query, chunk) pairs
 * and returns a [0..1] relevance score. Called after RRF to produce the
 * final top-K shown to the LLM.
 *
 * No-op (returns the input unchanged) when VOYAGE_API_KEY is missing — the
 * retrieval still works, just at lower quality. Tested in `rerank.test.ts`
 * with the env var absent.
 */
export async function rerank(
  query: string,
  chunks: RetrievedChunk[],
  topK: number,
): Promise<RetrievedChunk[]> {
  const apiKey = optionalEnv("VOYAGE_API_KEY");
  if (!apiKey || chunks.length === 0) return chunks.slice(0, topK);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      documents: chunks.map((c) => c.text),
      model: MODEL,
      top_k: topK,
    }),
  });
  if (!res.ok) {
    throw new Error(`Voyage rerank failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: { index: number; relevance_score: number }[] };
  const rows = data.data ?? [];
  return rows.map((r) => ({
    ...chunks[r.index]!,
    score: r.relevance_score,
  }));
}
