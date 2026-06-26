import { z } from "zod";

import {
  type QueryShape,
  QueryShapeSchema,
  type SufficiencyVerdict,
  SufficiencyVerdictSchema,
} from "@/lib/agents/state";

// Stable id for the streamed trace data part. Reusing one id lets each phase
// update overwrite the previous payload in place rather than appending parts.
export const TRACE_PART_ID = "trace";

// Data part carrying the persisted assistant message UUID, emitted once the
// answer is saved. The client uses it to finalize the bubble (clickable
// citations, collapsed trace) without depending on realtime delivery.
export const MESSAGE_ID_PART_ID = "messageId";

export type TracePhaseStatus = "active" | "done";

export type TracePhase =
  | { kind: "classify"; status: TracePhaseStatus; shape?: QueryShape }
  | { kind: "decompose"; status: TracePhaseStatus; subQueries: string[] }
  | {
      kind: "retrieve";
      status: TracePhaseStatus;
      candidates: number;
      reranked: number;
    }
  | { kind: "sufficiency"; status: TracePhaseStatus; verdict?: SufficiencyVerdict }
  | { kind: "synthesize"; status: TracePhaseStatus };

export interface TraceData {
  phases: TracePhase[];
}

const StatusSchema = z.enum(["active", "done"]);

const TracePhaseSchema: z.ZodType<TracePhase> = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("classify"),
    status: StatusSchema,
    shape: QueryShapeSchema.optional(),
  }),
  z.object({
    kind: z.literal("decompose"),
    status: StatusSchema,
    subQueries: z.array(z.string()),
  }),
  z.object({
    kind: z.literal("retrieve"),
    status: StatusSchema,
    candidates: z.number(),
    reranked: z.number(),
  }),
  z.object({
    kind: z.literal("sufficiency"),
    status: StatusSchema,
    verdict: SufficiencyVerdictSchema.optional(),
  }),
  z.object({ kind: z.literal("synthesize"), status: StatusSchema }),
]);

const TraceDataSchema = z.object({ phases: z.array(TracePhaseSchema) });

/**
 * Parses a streamed `data-trace` part defensively. The part data crosses the
 * wire as untrusted JSON, so a malformed payload yields null and the live
 * trace is hidden rather than throwing.
 */
export function parseTraceData(data: unknown): TraceData | null {
  const parsed = TraceDataSchema.safeParse(data);
  return parsed.success && parsed.data.phases.length > 0 ? parsed.data : null;
}
