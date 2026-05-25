import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { asCollectionId, asOrgId } from "@/lib/db/types";
import { setupIntegrationDb, truncateAllTenantTables } from "@/test/integration-db";

import { vectorSearch } from "./vector-search";

/**
 * Cross-tenant isolation test. Seeds two orgs with identical embeddings,
 * runs `vectorSearch` as org A, and asserts org B's chunks NEVER appear
 * in the results.
 *
 * This is the highest-stakes invariant in the product — a retrieval that
 * crosses tenant boundaries is a data breach.
 */
describe("vectorSearch tenant isolation", () => {
  let prisma: PrismaClient;
  // Initialized to no-op so afterAll never throws if beforeAll fails — that
  // would shadow the real setup error in CI output.
  let cleanup: () => Promise<void> = async () => {};

  beforeAll(async () => {
    ({ prisma, cleanup } = await setupIntegrationDb());
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    await truncateAllTenantTables(prisma);
  });

  it("never returns chunks belonging to other orgs", async () => {
    const seed = await seedTwoOrgs(prisma);

    // Embeddings are intentionally identical across the two orgs — only the
    // org_id filter should keep them separate.
    const queryVector = new Array(2048).fill(0.5) as number[];
    const resultsForA = await vectorSearch(seed.orgA, seed.collectionA, queryVector, 20);
    const resultsForB = await vectorSearch(seed.orgB, seed.collectionB, queryVector, 20);

    expect(resultsForA.length).toBeGreaterThan(0);
    expect(resultsForB.length).toBeGreaterThan(0);

    for (const chunk of resultsForA) {
      expect(seed.chunkIdsForA).toContain(chunk.chunkId);
      expect(seed.chunkIdsForB).not.toContain(chunk.chunkId);
    }
    for (const chunk of resultsForB) {
      expect(seed.chunkIdsForB).toContain(chunk.chunkId);
      expect(seed.chunkIdsForA).not.toContain(chunk.chunkId);
    }
  });

  it("scopes by collection too — orgA cannot peek into another orgA collection's chunks via the wrong id", async () => {
    const seed = await seedTwoOrgs(prisma);

    // Use orgA's id but orgB's collection id — must return nothing.
    const queryVector = new Array(2048).fill(0.5) as number[];
    const results = await vectorSearch(seed.orgA, seed.collectionB, queryVector, 20);
    expect(results).toEqual([]);
  });
});

async function seedTwoOrgs(prisma: PrismaClient) {
  const orgAId = "11111111-1111-1111-1111-111111111111";
  const orgBId = "22222222-2222-2222-2222-222222222222";
  const userAId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const userBId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const collectionAId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const collectionBId = "dddddddd-dddd-dddd-dddd-dddddddddddd";

  // Direct inserts via raw SQL to bypass the `$extends` middleware (we're
  // simulating two tenants in one call site).
  await prisma.$executeRawUnsafe(
    `INSERT INTO users (id, email, created_at, updated_at) VALUES
      ($1::uuid, 'a@example.com', NOW(), NOW()),
      ($2::uuid, 'b@example.com', NOW(), NOW())`,
    userAId,
    userBId,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES
      ($1::uuid, 'Org A', 'org-a-test', NOW(), NOW()),
      ($2::uuid, 'Org B', 'org-b-test', NOW(), NOW())`,
    orgAId,
    orgBId,
  );

  const chunkIdsForA = await seedDocumentWithChunks(
    prisma,
    orgAId,
    userAId,
    collectionAId,
    "Doc A",
  );
  const chunkIdsForB = await seedDocumentWithChunks(
    prisma,
    orgBId,
    userBId,
    collectionBId,
    "Doc B",
  );

  return {
    orgA: asOrgId(orgAId),
    orgB: asOrgId(orgBId),
    collectionA: asCollectionId(collectionAId),
    collectionB: asCollectionId(collectionBId),
    chunkIdsForA,
    chunkIdsForB,
  };
}

async function seedDocumentWithChunks(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
  collectionId: string,
  docName: string,
): Promise<string[]> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO collections (id, org_id, name, created_by_user_id, created_at, updated_at)
     VALUES ($1::uuid, $2::uuid, $3, $4::uuid, NOW(), NOW())`,
    collectionId,
    orgId,
    `Collection ${orgId}`,
    userId,
  );

  const docId = `${collectionId.slice(0, -1)}f`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO documents (
       id, org_id, collection_id, name, format, status,
       storage_path, mime_type, size_bytes, created_by_user_id,
       created_at, updated_at, indexed_at
     ) VALUES (
       $1::uuid, $2::uuid, $3::uuid, $4, 'HTML', 'INDEXED',
       'fake/path', 'text/html', 100, $5::uuid,
       NOW(), NOW(), NOW()
     )`,
    docId,
    orgId,
    collectionId,
    docName,
    userId,
  );

  const partId = `${collectionId.slice(0, -2)}fe`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO document_parts (
       id, org_id, document_id, index, body, metadata, created_at
     ) VALUES (
       $1::uuid, $2::uuid, $3::uuid, 0, '<p>hello</p>',
       '{"kind":"html","heading":null}'::jsonb, NOW()
     )`,
    partId,
    orgId,
    docId,
  );

  const chunkIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const chunkId = `${collectionId.slice(0, -3)}${i}ed`;
    chunkIds.push(chunkId);
    await prisma.$executeRawUnsafe(
      `INSERT INTO document_chunks (
         id, org_id, document_id, part_id, index, text,
         token_count, location, created_at
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6,
         10, $7::jsonb, NOW()
       )`,
      chunkId,
      orgId,
      docId,
      partId,
      i,
      `chunk text ${i} from ${docName}`,
      JSON.stringify({
        kind: "html",
        partIndex: 0,
        selector: `div > p:nth-of-type(${i + 1})`,
        charStart: 0,
        charEnd: 20,
      }),
    );
    // Same embedding vector in both orgs so the only differentiator is
    // org_id.
    const vector = `[${new Array(2048).fill(0.5).join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO embeddings (id, org_id, chunk_id, embedding, created_at)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::halfvec, NOW())`,
      orgId,
      chunkId,
      vector,
    );
  }
  return chunkIds;
}
