import { describe, expect, it } from "vitest";

import type { AgentProgress } from "@/lib/agents/runner";

import { buildTrace } from "./trace-builder";

function applyAll(events: AgentProgress[]) {
  const trace = buildTrace();
  for (const event of events) trace.apply(event);
  return trace;
}

describe("buildTrace", () => {
  it("starts with classify active before any event", () => {
    const trace = buildTrace();

    expect(trace.snapshot().phases).toEqual([{ kind: "classify", status: "active" }]);
  });

  it("walks a simple-shape query: classify → retrieve → sufficiency", () => {
    const trace = applyAll([
      { phase: "classify", result: { shape: "simple", reasoning: "" } },
      { phase: "subQueries", subQueries: ["what is X"] },
      { phase: "retrieved", candidates: 24, reranked: 8 },
      { phase: "sufficiency", result: { verdict: "sufficient", reasoning: "" } },
    ]);

    expect(trace.snapshot().phases).toEqual([
      { kind: "classify", status: "done", shape: "simple" },
      { kind: "retrieve", status: "done", candidates: 24, reranked: 8 },
      { kind: "sufficiency", status: "done", verdict: "sufficient" },
    ]);
  });

  it("inserts a decompose phase only for decompose-shape queries", () => {
    const trace = applyAll([
      { phase: "classify", result: { shape: "decompose", reasoning: "" } },
      { phase: "decompose", result: { subQueries: ["a", "b", "c"] } },
      { phase: "subQueries", subQueries: ["a", "b", "c"] },
    ]);

    const phases = trace.snapshot().phases;
    expect(phases[0]).toEqual({ kind: "classify", status: "done", shape: "decompose" });
    expect(phases[1]).toEqual({
      kind: "decompose",
      status: "done",
      subQueries: ["a", "b", "c"],
    });
    expect(phases[2]).toEqual({ kind: "retrieve", status: "active", candidates: 0, reranked: 0 });
  });

  it("keeps the latest phase active until the next event arrives", () => {
    const trace = buildTrace();
    trace.apply({ phase: "classify", result: { shape: "simple", reasoning: "" } });
    trace.apply({ phase: "subQueries", subQueries: ["q"] });

    const phases = trace.snapshot().phases;
    expect(phases.at(-1)).toEqual({
      kind: "retrieve",
      status: "active",
      candidates: 0,
      reranked: 0,
    });
  });

  it("appends an active synthesize phase and closes prior phases on beginSynthesis", () => {
    const trace = applyAll([
      { phase: "classify", result: { shape: "simple", reasoning: "" } },
      { phase: "subQueries", subQueries: ["q"] },
      { phase: "retrieved", candidates: 12, reranked: 6 },
      { phase: "sufficiency", result: { verdict: "insufficient", reasoning: "" } },
    ]);
    trace.beginSynthesis();

    const phases = trace.snapshot().phases;
    expect(
      phases.every((p) => (p.kind === "synthesize" ? p.status === "active" : p.status === "done")),
    ).toBe(true);
    expect(phases.at(-1)).toEqual({ kind: "synthesize", status: "active" });
  });
});
