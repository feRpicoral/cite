import "server-only";

import { type Prisma } from "@prisma/client";

import { getPrisma } from "@/lib/db/client";
import { asDocumentId, type DocumentId, type OrgId } from "@/lib/db/types";
import { downloadDocumentBuffer } from "@/lib/storage/documents";

import { chunkDocument } from "./chunk";
import { buildEmbeddingInput, enrichChunksWithContext } from "./contextual-retrieval";
import { embedTexts } from "./embed";
import { pickParser } from "./parsers/registry";
import type { NormalizedDocument } from "./parsers/types";

/**
 * End-to-end ingestion: download the uploaded blob, run the right parser,
 * chunk, enrich, embed, and write everything back transactionally per stage.
 *
 * Stages emit visible status changes so the UI can show progress:
 *   UPLOADING (set by API route) → EXTRACTING → CHUNKING → EMBEDDING → INDEXED
 *
 * Throws on any unrecoverable step. The Inngest worker catches and writes
 * status=FAILED.
 */
export async function processDocument(orgId: OrgId, documentId: DocumentId): Promise<void> {
  const normalized = await parseStage(orgId, documentId);
  await persistStage(orgId, documentId, normalized);
}

/**
 * Download + parse. Returns a JSON-serializable NormalizedDocument so the
 * Inngest worker can run this as its own memoized step (a persist retry won't
 * re-download or re-parse).
 */
export async function parseStage(
  orgId: OrgId,
  documentId: DocumentId,
): Promise<NormalizedDocument> {
  const prisma = getPrisma();
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  if (doc.orgId !== orgId) throw new Error("document/org mismatch");

  await prisma.document.update({ where: { id: documentId }, data: { status: "EXTRACTING" } });
  const buffer = await downloadDocumentBuffer(doc.storagePath);
  const parser = pickParser(doc.mimeType, doc.name);
  return parser.parse(buffer, { filename: doc.name, mimeType: doc.mimeType });
}

/**
 * Chunk, enrich, embed, and swap the index atomically. Parts and chunks are
 * replaced inside a single transaction so a duplicate event or re-ingest of an
 * INDEXED document never wipes the live index (and its citation targets)
 * before the replacement is ready.
 *
 * Embeddings are generated and consumed inside this stage; they aren't
 * memoized across step boundaries because a per-chunk halfvec(2048) payload is
 * too large to round-trip through Inngest step state. A retry of this stage
 * re-embeds.
 */
export async function persistStage(
  orgId: OrgId,
  documentId: DocumentId,
  normalized: NormalizedDocument,
): Promise<void> {
  const prisma = getPrisma();

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "CHUNKING", pageCount: normalized.pageCount ?? null },
  });

  const rawChunks = chunkDocument(normalized);
  const enriched = await enrichChunksWithContext(normalized, rawChunks);

  await prisma.document.update({ where: { id: documentId }, data: { status: "EMBEDDING" } });

  const inputs = enriched.map(buildEmbeddingInput);
  const embeddings = await embedTexts(inputs);

  await prisma.$transaction(async (tx) => {
    await tx.documentPart.deleteMany({ where: { documentId } });
    await tx.documentPart.createMany({
      data: normalized.parts.map((p) => ({
        orgId,
        documentId,
        index: p.index,
        body: p.body,
        metadata: p.metadata,
      })),
    });
    const parts = await tx.documentPart.findMany({
      where: { documentId },
      select: { id: true, index: true },
    });
    const partIdByIndex = new Map(parts.map((p) => [p.index, p.id]));

    await tx.documentChunk.deleteMany({ where: { documentId } });
    for (let i = 0; i < enriched.length; i++) {
      const chunk = enriched[i]!;
      const vector = embeddings[i]!;
      const partId = partIdByIndex.get(chunk.partIndex);
      if (!partId) throw new Error(`No part for index ${chunk.partIndex}`);

      const createdChunk = await tx.documentChunk.create({
        data: {
          orgId,
          documentId,
          partId,
          index: chunk.index,
          text: chunk.text,
          contextualPreamble: chunk.contextualPreamble ?? null,
          tokenCount: chunk.tokenCount,
          location: chunk.location as unknown as Prisma.InputJsonValue,
        },
      });

      // Raw SQL — pgvector's `halfvec` type isn't part of Prisma's generated
      // client. Tenant scope is enforced by the application-level `orgId`
      // column on the insert; RLS is the second layer.
      await tx.$executeRawUnsafe(
        `INSERT INTO embeddings (id, org_id, chunk_id, embedding, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::halfvec, NOW())`,
        orgId,
        createdChunk.id,
        `[${vector.join(",")}]`,
      );
    }
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "INDEXED", indexedAt: new Date(), errorMessage: null },
  });
}

export function asDocId(id: string): DocumentId {
  return asDocumentId(id);
}
