import type { RetrievedChunk } from "./types";

const RRF_K = 60;

/**
 * Reciprocal Rank Fusion of multiple ranked lists. The score for each chunk
 * is the sum of `1 / (RRF_K + rank)` across every list it appears in. Order
 * within each list matters; absolute scores don't, which is why RRF works
 * well across rankers with incompatible score scales (cosine sim vs BM25
 * vs cross-encoder).
 *
 * `RRF_K = 60` is the canonical value from the original Cormack/Clarke paper.
 */
export function rrfFuse(lists: RetrievedChunk[][], limit: number): RetrievedChunk[] {
  const byId = new Map<string, RetrievedChunk & { _rrf: number }>();

  for (const list of lists) {
    list.forEach((chunk, idx) => {
      const rank = idx + 1;
      const rrfScore = 1 / (RRF_K + rank);
      const existing = byId.get(chunk.chunkId);
      if (existing) {
        existing._rrf += rrfScore;
      } else {
        byId.set(chunk.chunkId, { ...chunk, _rrf: rrfScore });
      }
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => b._rrf - a._rrf)
    .slice(0, limit)
    .map(({ _rrf, ...chunk }) => ({ ...chunk, score: _rrf }));
}
