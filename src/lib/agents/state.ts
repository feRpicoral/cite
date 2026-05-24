import { z } from "zod";

import type { RetrievedChunk } from "@/lib/retrieval/types";

export const QueryShapeSchema = z.enum(["simple", "decompose"]);
export type QueryShape = z.infer<typeof QueryShapeSchema>;

export const SufficiencyVerdictSchema = z.enum(["sufficient", "insufficient"]);
export type SufficiencyVerdict = z.infer<typeof SufficiencyVerdictSchema>;

export const ClassifyResultSchema = z.object({
  shape: QueryShapeSchema,
  reasoning: z.string(),
});
export type ClassifyResult = z.infer<typeof ClassifyResultSchema>;

export const DecomposeResultSchema = z.object({
  subQueries: z.array(z.string().min(1)).min(1).max(5),
});
export type DecomposeResult = z.infer<typeof DecomposeResultSchema>;

export const SufficiencyResultSchema = z.object({
  verdict: SufficiencyVerdictSchema,
  reasoning: z.string(),
});
export type SufficiencyResult = z.infer<typeof SufficiencyResultSchema>;

export interface RetrievalRound {
  query: string;
  chunks: RetrievedChunk[];
}

/**
 * Accumulated state the agent walks through. Each node reads what it
 * needs and writes its slice. The runner serializes this for tracing,
 * so keep it JSON-safe.
 */
export interface AgentState {
  collectionId: string;
  query: string;
  classify?: ClassifyResult;
  subQueries: string[];
  rounds: RetrievalRound[];
  sufficiency?: SufficiencyResult;
  finalChunks: RetrievedChunk[];
}
