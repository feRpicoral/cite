import { requireEnv } from "@/lib/env";

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-large";
const BATCH_SIZE = 128;

/**
 * Embeds chunks via Voyage 3 large (2048 dims — must match the vector
 * column width in `embeddings`). The contextual preamble shaping happens
 * upstream in `buildEmbeddingInput`.
 *
 * Calls the Voyage REST API directly. The official SDK ships ESM-incompatible
 * directory imports that break the Next.js bundler.
 *
 * Batches up to 128 inputs per request; retries with exponential backoff
 * on 429 / 5xx.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const apiKey = requireEnv("VOYAGE_API_KEY");
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const data = await withRetry(() =>
      callEmbed(apiKey, { input: batch, model: MODEL, input_type: "document" }),
    );
    const rows = data.data ?? [];
    if (rows.length !== batch.length) {
      throw new Error(`Voyage returned ${rows.length} embeddings for batch of ${batch.length}`);
    }
    for (const row of rows) out.push(row.embedding);
  }
  return out;
}

interface EmbedRequest {
  input: string[];
  model: string;
  input_type: "document" | "query";
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
      // Don't retry 4xx other than 429.
      if (status >= 400 && status < 500 && status !== 429) throw err;
      const delay = 250 * 2 ** i;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
