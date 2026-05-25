import { requireEnv } from "@/lib/env";

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-large";

/**
 * Embeds a single query string for vector search. Uses input_type=query
 * (vs document for indexing) so Voyage applies the query-side projection.
 */
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
      output_dimension: 2048,
    }),
  });
  if (!res.ok) {
    throw new Error(`Voyage embed query failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: { embedding: number[] }[] };
  const embedding = data.data?.[0]?.embedding;
  if (!embedding) throw new Error("Voyage returned no embedding for the query");
  return embedding;
}
