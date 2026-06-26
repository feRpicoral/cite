import { z } from "zod";

const AgentStateShape = z.object({
  classify: z.object({ shape: z.enum(["simple", "decompose"]) }).optional(),
  subQueries: z.array(z.string()).optional(),
  rounds: z.array(z.unknown()).optional(),
  sufficiency: z.object({ verdict: z.enum(["sufficient", "insufficient"]) }).optional(),
});

export interface ReasoningSummary {
  shape: "simple" | "decompose";
  subQueries: string[];
  reranked: boolean;
  sufficient: boolean;
}

/**
 * Distills a persisted assistant message's `agentState` JSON into the values
 * the reasoning-trace chip renders. The column is untrusted DB JSON, so it's
 * parsed defensively — a malformed or absent state yields null and the chip
 * is hidden rather than throwing.
 */
export function summarizeReasoning(agentState: unknown): ReasoningSummary | null {
  const parsed = AgentStateShape.safeParse(agentState);
  if (!parsed.success || !parsed.data.classify) return null;
  const { classify, subQueries, rounds, sufficiency } = parsed.data;
  return {
    shape: classify.shape,
    subQueries: subQueries ?? [],
    reranked: (rounds?.length ?? 0) > 0,
    sufficient: sufficiency?.verdict !== "insufficient",
  };
}
