import { requireEnv } from "@/lib/env";

import { countTokens } from "./chunk";

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-large";
const MAX_BATCH_ITEMS = 128;
// Voyage caps a single request at 120k tokens; stay under it with headroom
// since countTokens is an approximation of the provider's own tokenizer.
const MAX_BATCH_TOKENS = 100_000;
// voyage-3-large supports 256, 512, 1024 (default), and 2048. We pick 2048
// to match the `halfvec(2048)` column in the embeddings table. The API
// returns 1024 if this is omitted, which then fails the INSERT with
// "expected 2048 dimensions, not 1024".
const OUTPUT_DIMENSION = 2048;

/**
 * Calls the Voyage REST API directly: the official SDK ships ESM-incompatible
 * directory imports that break the Next.js bundler. Batches by both item count
 * (<=128) and accumulated tokens (under Voyage's 120k-per-request limit), with
 * exponential backoff on 429 / 5xx.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const apiKey = requireEnv("VOYAGE_API_KEY");
  const out: number[][] = [];

  for (const batch of planBatches(texts)) {
    const data = await withRetry(() =>
      callEmbed(apiKey, {
        input: batch,
        model: MODEL,
        input_type: "document",
        output_dimension: OUTPUT_DIMENSION,
      }),
    );
    const rows = data.data ?? [];
    if (rows.length !== batch.length) {
      throw new Error(`Voyage returned ${rows.length} embeddings for batch of ${batch.length}`);
    }
    for (const row of rows) out.push(row.embedding);
  }
  return out;
}

/**
 * Splits inputs into requests bounded by both MAX_BATCH_ITEMS and
 * MAX_BATCH_TOKENS. A single input that alone exceeds the token cap is sent
 * as its own batch rather than dropped or looping forever; Voyage rejects it
 * only if it also breaches the per-input limit, which is handled separately.
 */
export function planBatches(texts: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const text of texts) {
    const tokens = countTokens(text);
    const exceedsTokens = current.length > 0 && currentTokens + tokens > MAX_BATCH_TOKENS;
    const exceedsItems = current.length >= MAX_BATCH_ITEMS;
    if (exceedsTokens || exceedsItems) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(text);
    currentTokens += tokens;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

interface EmbedRequest {
  input: string[];
  model: string;
  input_type: "document" | "query";
  output_dimension: number;
}

interface EmbedResponse {
  data?: { embedding: number[] }[];
}

async function callEmbed(apiKey: string, body: EmbedRequest): Promise<EmbedResponse> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Voyage embed failed (${res.status}): ${text}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as EmbedResponse;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status ?? 0;
      if (status >= 400 && status < 500 && status !== 429) throw err;
      const delay = 250 * 2 ** i;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
