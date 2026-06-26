import "server-only";

import { type CollectionId, type OrgId } from "@/lib/db/types";
import { hybridRetrieve } from "@/lib/retrieval";
import { rrfFuse } from "@/lib/retrieval/hybrid";

import { classifyQuery } from "./nodes/classify";
import { decomposeQuery } from "./nodes/decompose";
import { judgeSufficiency } from "./nodes/sufficiency";
import type { AgentState, ClassifyResult, DecomposeResult, SufficiencyResult } from "./state";

/**
 * Node-level progress emitted as the agent runs, so a caller can stream the
 * retrieval trace to the UI before synthesis text arrives. Each event fires
 * once its node completes; `retrieved` fires per round with running counts.
 */
export type AgentProgress =
  | { phase: "classify"; result: ClassifyResult }
  | { phase: "decompose"; result: DecomposeResult }
  | { phase: "subQueries"; subQueries: string[] }
  | { phase: "retrieved"; candidates: number; reranked: number }
  | { phase: "sufficiency"; result: SufficiencyResult };

interface RunOptions {
  orgId: OrgId;
  collectionId: CollectionId;
  query: string;
  topK?: number;
  maxRounds?: number;
  /**
   * Called as each node completes so the caller can stream live progress.
   * Optional — the runner works identically without it.
   */
  onProgress?: (event: AgentProgress) => void;
  /**
   * Test hook: when set, runs in offline mode — skips LLM-driven decisions
   * and just executes a single hybrid retrieval round. Production code
   * never sets this.
   */
  retrieverOverride?: typeof hybridRetrieve;
  /**
   * Test hook: same idea, lets a unit test inject LLM stand-ins for
   * classify / decompose / sufficiency.
   */
  llmOverride?: Partial<{
    classify: typeof classifyQuery;
    decompose: typeof decomposeQuery;
    sufficiency: typeof judgeSufficiency;
  }>;
}

/**
 * Agent runner: classify → (maybe) decompose → retrieve (parallel per sub-
 * query) → judge sufficiency → re-retrieve once if insufficient → return
 * top-K reranked chunks. The state object is what the citation-accuracy
 * audit later replays.
 */
export async function runAgent(opts: RunOptions): Promise<AgentState> {
  const retrieve = opts.retrieverOverride ?? hybridRetrieve;
  const classify = opts.llmOverride?.classify ?? classifyQuery;
  const decompose = opts.llmOverride?.decompose ?? decomposeQuery;
  const sufficient = opts.llmOverride?.sufficiency ?? judgeSufficiency;

  const topK = opts.topK ?? 10;
  const maxRounds = opts.maxRounds ?? 2;
  const onProgress = opts.onProgress;

  const state: AgentState = {
    collectionId: opts.collectionId,
    query: opts.query,
    subQueries: [],
    rounds: [],
    finalChunks: [],
  };

  state.classify = await classify(opts.query);
  onProgress?.({ phase: "classify", result: state.classify });

  if (state.classify.shape === "decompose") {
    const decomposed = await decompose(opts.query);
    state.subQueries = decomposed.subQueries;
    onProgress?.({ phase: "decompose", result: decomposed });
  } else {
    state.subQueries = [opts.query];
  }
  onProgress?.({ phase: "subQueries", subQueries: state.subQueries });

  for (let round = 0; round < maxRounds; round++) {
    const roundTopK = topK * (round + 1);
    const results = await Promise.all(
      state.subQueries.map(async (sq) => ({
        query: sq,
        chunks: await retrieve(opts.orgId, opts.collectionId, sq, roundTopK),
      })),
    );
    state.rounds.push(...results);

    const candidates = results.reduce((sum, r) => sum + r.chunks.length, 0);
    const previousIds = chunkIdKey(state.finalChunks);
    state.finalChunks = rrfFuse(
      results.map((r) => r.chunks),
      topK,
    );
    onProgress?.({
      phase: "retrieved",
      candidates,
      reranked: state.finalChunks.length,
    });

    if (round > 0 && chunkIdKey(state.finalChunks) === previousIds) break;

    state.sufficiency = await sufficient(opts.query, state.finalChunks);
    onProgress?.({ phase: "sufficiency", result: state.sufficiency });
    if (state.sufficiency.verdict === "sufficient") break;
  }

  return state;
}

function chunkIdKey(chunks: { chunkId: string }[]): string {
  return chunks
    .map((c) => c.chunkId)
    .sort()
    .join(",");
}
