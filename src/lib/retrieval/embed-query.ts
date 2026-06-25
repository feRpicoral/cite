import { requireEnv } from "@/lib/env";

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-large";
const EXPECTED_DIMENSION = 2048;

export class EmbeddingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingValidationError";
  }
}

export async function embedQuery(query: string): Promise<number[]> {
  const apiKey = requireEnv("VOYAGE_API_KEY");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    // output_dimension must match what was used at indexing time; see
    // src/lib/ingestion/embed.ts. Mismatched dims would produce vectors
    // the column rejects and meaningless cosine distances.
    body: JSON.stringify({
      input: [query],
      model: MODEL,
      input_type: "query",
      output_dimension: EXPECTED_DIMENSION,
    }),
  });
  if (!res.ok) {
    throw new Error(`Voyage embed query failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: { embedding: unknown }[] };
  const embedding = data.data?.[0]?.embedding;
  if (
    !Array.isArray(embedding) ||
    embedding.length !== EXPECTED_DIMENSION ||
    !embedding.every(Number.isFinite)
  ) {
    const got = Array.isArray(embedding) ? `length ${embedding.length}` : typeof embedding;
    throw new EmbeddingValidationError(
      `Voyage ${MODEL} returned an invalid query embedding: expected ${EXPECTED_DIMENSION} finite numbers, got ${got}`,
    );
  }
  return embedding;
}
