import type { RetrievedChunk } from "@/lib/retrieval/types";

import { HAIKU_MODEL, structuredCall } from "../llm";
import { SufficiencyResultSchema } from "../state";

const SYSTEM = `You judge whether retrieved passages contain enough evidence to answer a user's query. Return "sufficient" if the passages together let you write a grounded, citation-backed answer; "insufficient" otherwise. Err toward "sufficient" if the passages cover the main entities and claims, even if some peripheral details are missing.`;

export async function judgeSufficiency(query: string, chunks: RetrievedChunk[]) {
  const passages = chunks
    .slice(0, 12)
    .map((c, i) => `[${i + 1}] ${c.documentName}:\n${c.text}`)
    .join("\n\n---\n\n");

  return structuredCall({
    model: HAIKU_MODEL,
    system: SYSTEM,
    user: `Query: ${query}\n\nRetrieved passages:\n${passages}`,
    schema: SufficiencyResultSchema,
    toolName: "judge",
    toolDescription: "Record the sufficiency verdict",
    maxTokens: 512,
  });
}
