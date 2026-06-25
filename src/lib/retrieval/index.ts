import "server-only";

import { type CollectionId, type OrgId } from "@/lib/db/types";

import { embedQuery } from "./embed-query";
import { rrfFuse } from "./hybrid";
import { keywordSearch } from "./keyword-search";
import { rerank } from "./rerank";
import type { RetrievedChunk } from "./types";
import { vectorSearch } from "./vector-search";

export async function hybridRetrieve(
  orgId: OrgId,
  collectionId: CollectionId,
  query: string,
  topK: number = 10,
): Promise<RetrievedChunk[]> {
  const vectorTarget = topK * 4;
  const keywordTarget = topK * 4;

  const [queryEmbedding, keywordResults] = await Promise.all([
    embedQuery(query),
    keywordSearch(orgId, collectionId, query, keywordTarget),
  ]);
  const vectorResults = await vectorSearch(orgId, collectionId, queryEmbedding, vectorTarget);

  const fused = rrfFuse([vectorResults, keywordResults], topK * 2);
  const reranked = await rerank(query, fused, topK);
  return reranked;
}
