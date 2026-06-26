import type { AgentProgress } from "@/lib/agents/runner";
import type { TraceData, TracePhase } from "@/lib/chat/trace";

/**
 * Accumulates agent progress events into the ordered phase list the chat UI
 * renders, with the latest phase `active` and finished phases flipped to `done`.
 * Starts with classify already active so the trace appears before the first
 * node returns.
 */
export function buildTrace(): {
  apply: (event: AgentProgress) => void;
  beginSynthesis: () => void;
  finishSynthesis: () => void;
  snapshot: () => TraceData;
} {
  let classify: Extract<TracePhase, { kind: "classify" }> = {
    kind: "classify",
    status: "active",
  };
  let decompose: Extract<TracePhase, { kind: "decompose" }> | undefined;
  let retrieve: Extract<TracePhase, { kind: "retrieve" }> | undefined;
  let sufficiency: Extract<TracePhase, { kind: "sufficiency" }> | undefined;
  let synthesize: Extract<TracePhase, { kind: "synthesize" }> | undefined;

  function apply(event: AgentProgress): void {
    switch (event.phase) {
      case "classify":
        classify = { kind: "classify", status: "done", shape: event.result.shape };
        if (event.result.shape === "decompose") {
          decompose = { kind: "decompose", status: "active", subQueries: [] };
        }
        break;
      case "decompose":
        decompose = {
          kind: "decompose",
          status: "active",
          subQueries: event.result.subQueries,
        };
        break;
      case "subQueries":
        if (decompose) {
          decompose = { ...decompose, status: "done", subQueries: event.subQueries };
        }
        retrieve = { kind: "retrieve", status: "active", candidates: 0, reranked: 0 };
        break;
      case "retrieved":
        retrieve = {
          kind: "retrieve",
          status: "done",
          candidates: event.candidates,
          reranked: event.reranked,
        };
        sufficiency = { kind: "sufficiency", status: "active" };
        break;
      case "sufficiency":
        sufficiency = {
          kind: "sufficiency",
          status: "done",
          verdict: event.result.verdict,
        };
        break;
    }
  }

  // Re-retrieval rounds can leave retrieve/sufficiency active, so force them
  // done before handing off to synthesis.
  function beginSynthesis(): void {
    if (retrieve) retrieve = { ...retrieve, status: "done" };
    if (sufficiency) sufficiency = { ...sufficiency, status: "done" };
    synthesize = { kind: "synthesize", status: "active" };
  }

  // Flip synthesis to done when the text stream completes, else its spinner
  // appears stuck.
  function finishSynthesis(): void {
    if (synthesize) synthesize = { ...synthesize, status: "done" };
  }

  function snapshot(): TraceData {
    const phases: TracePhase[] = [classify];
    if (decompose) phases.push(decompose);
    if (retrieve) phases.push(retrieve);
    if (sufficiency) phases.push(sufficiency);
    if (synthesize) phases.push(synthesize);
    return { phases };
  }

  return { apply, beginSynthesis, finishSynthesis, snapshot };
}
