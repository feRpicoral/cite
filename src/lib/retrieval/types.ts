import type { DocumentLocation } from "@/lib/ingestion/location";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentName: string;
  text: string;
  location: DocumentLocation;
  /**
   * Score depends on which retriever produced it:
   *   - vector-search: 1 - cosine_distance (so higher = better)
   *   - keyword-search: ts_rank, normalized to [0, 1]
   *   - hybrid: RRF score, ~[0, 0.033]
   *   - reranked: rerank model's score, typically [0, 1]
   * Always compare scores within the same source, never across.
   */
  score: number;
}

export interface RetrievalRequest {
  query: string;
  collectionId: string;
  limit?: number;
}
