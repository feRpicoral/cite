import "server-only";

import { getPrisma } from "@/lib/db/client";
import { type CollectionId, type OrgId } from "@/lib/db/types";
import { parseLocation } from "@/lib/ingestion/location";

import type { RetrievedChunk } from "./types";

/**
 * Tenant-scoped pgvector similarity search.
 *
 * SECURITY: this is the most common place RAG products leak across tenants.
 * The `WHERE org_id = $1` clause filters BEFORE the cosine-distance ORDER BY
 * — Postgres's planner uses the btree(org_id) + HNSW combo defined in
 * setup.sql. RLS (`tenant_isolation`) is the second layer; never rely on
 * either alone.
 *
 * The function takes branded OrgId / CollectionId, so the compiler stops
 * you mixing tenants at the call site.
 */
export async function vectorSearch(
  orgId: OrgId,
  collectionId: CollectionId,
  queryEmbedding: number[],
  limit: number,
): Promise<RetrievedChunk[]> {
  const vector = `[${queryEmbedding.join(",")}]`;
  const rows = await getPrisma().$queryRawUnsafe<RawRow[]>(
    `
    SELECT
      c.id            AS "chunkId",
      c.document_id   AS "documentId",
      d.name          AS "documentName",
      c.text          AS "text",
      c.location      AS "location",
      1 - (e.embedding <=> $3::vector) AS "score"
    FROM embeddings e
    INNER JOIN document_chunks c ON c.id = e.chunk_id
    INNER JOIN documents d       ON d.id = c.document_id
    WHERE e.org_id = $1::uuid
      AND d.collection_id = $2::uuid
      AND d.status = 'INDEXED'
    ORDER BY e.embedding <=> $3::vector
    LIMIT $4
    `,
    orgId,
    collectionId,
    vector,
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
