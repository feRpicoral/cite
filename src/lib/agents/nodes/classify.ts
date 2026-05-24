import { HAIKU_MODEL, structuredCall } from "../llm";
import { ClassifyResultSchema } from "../state";

const SYSTEM = `Classify retrieval queries by shape. Return shape="decompose" only when the query asks for two or more distinct things that need separate retrieval (e.g. "compare X and Y", "summarize sections 3 and 5"). Most queries are "simple".`;

export async function classifyQuery(query: string) {
  return structuredCall({
    model: HAIKU_MODEL,
    system: SYSTEM,
    user: `Query: ${query}`,
    schema: ClassifyResultSchema,
    toolName: "classify",
    toolDescription: "Record the shape of the query",
  });
}
