import { HAIKU_MODEL, structuredCall } from "../llm";
import { DecomposeResultSchema } from "../state";

const SYSTEM = `Split a multi-part retrieval query into 2-5 atomic sub-queries that can be retrieved against independently. Each sub-query should be a complete, self-contained question. Do not invent topics that aren't in the original query.`;

export async function decomposeQuery(query: string) {
  return structuredCall({
    model: HAIKU_MODEL,
    system: SYSTEM,
    user: `Original query: ${query}`,
    schema: DecomposeResultSchema,
    toolName: "decompose",
    toolDescription: "Record the sub-queries",
  });
}
