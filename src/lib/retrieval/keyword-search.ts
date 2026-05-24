import "server-only";

import { getPrisma } from "@/lib/db/client";
import { type CollectionId, type OrgId } from "@/lib/db/types";
import { parseLocation } from "@/lib/ingestion/location";

import type { RetrievedChunk } from "./types";

/**
 * Tenant-scoped keyword search via Postgres `ts_rank`. Uses the
 * `document_chunks_text_search_idx` GIN index from setup.sql. Same WHERE-
 * before-ORDER pattern as vector-search to keep the planner happy.
 *
 * `plainto_tsquery` is used so the query string can be passed unparsed
 * (handles raw user input without query-syntax surprises).
 */
export async function keywordSearch(
  orgId: OrgId,
  collectionId: CollectionId,
  query: string,
  limit: number,
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];
  const rows = await getPrisma().$queryRawUnsafe<RawRow[]>(
    `
    SELECT
      c.id          AS "chunkId",
      c.document_id AS "documentId",
      d.name        AS "documentName",
      c.text        AS "text",
      c.location    AS "location",
      ts_rank(to_tsvector('simple', c.text), plainto_tsquery('simple', $3)) AS "score"
    FROM document_chunks c
    INNER JOIN documents d ON d.id = c.document_id
    WHERE c.org_id = $1::uuid
      AND d.collection_id = $2::uuid
      AND d.status = 'INDEXED'
      AND to_tsvector('simple', c.text) @@ plainto_tsquery('simple', $3)
    ORDER BY "score" DESC
    LIMIT $4
    `,
    orgId,
    collectionId,
    query,
    limit,
  );

  return rows.map((r) => ({
    chunkId: r.chunkId,
    documentId: r.documentId,
    documentName: r.documentName,
    text: r.text,
    location: parseLocation(r.location),
    score: Number(r.score),
  }));
}

interface RawRow {
  chunkId: string;
  documentId: string;
  documentName: string;
  text: string;
  location: unknown;
  score: string | number;
}
