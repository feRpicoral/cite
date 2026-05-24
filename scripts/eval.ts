/**
 * Offline retrieval evaluation harness.
 *
 *   yarn eval [--collection <id>] [--fixture <path>]
 *
 * Loads a fixture file of `{ query, expectedDocumentIds }` rows, runs the
 * hybrid retriever for each query against the given collection, and prints
 * precision@k / recall@k / MRR aggregates.
 *
 * Requires DATABASE_URL and VOYAGE_API_KEY at minimum. The default fixture
 * lives at `eval/fixtures.json` — see `eval/README.md` for the schema.
 */

import "@/test/server-only-stub";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { loadEnvConfig } from "@next/env";
import { z } from "zod";

loadEnvConfig(process.cwd());

const FixtureRowSchema = z.object({
  query: z.string().min(1),
  expectedDocumentIds: z.array(z.string().uuid()).min(1),
});
const FixtureSchema = z.array(FixtureRowSchema);

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    collection: { type: "string" },
    fixture: { type: "string", default: "eval/fixtures.json" },
    k: { type: "string", default: "10" },
  },
});

const collectionId = values.collection;
if (!collectionId) {
  console.error("Usage: yarn eval --collection <uuid> [--fixture path]");
  process.exit(1);
}
const k = Number.parseInt(values.k ?? "10", 10);

async function main() {
  const fixturePath = join(process.cwd(), values.fixture ?? "eval/fixtures.json");
  const fixture = FixtureSchema.parse(JSON.parse(readFileSync(fixturePath, "utf-8")));

  const { hybridRetrieve } = await import("@/lib/retrieval");
  const { asCollectionId, asOrgId } = await import("@/lib/db/types");
  const { getPrisma } = await import("@/lib/db/client");

  // Look up the org of the collection so the eval can run without a session.
  const prisma = getPrisma();
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId! },
    select: { orgId: true },
  });
  if (!collection) {
    console.error(`Collection ${collectionId!} not found`);
    process.exit(1);
  }
  const orgId = asOrgId(collection.orgId);
  const colId = asCollectionId(collectionId!);

  let precisionSum = 0;
  let recallSum = 0;
  let mrrSum = 0;
  const perQuery: { query: string; precision: number; recall: number; mrr: number }[] = [];

  for (const row of fixture) {
    const start = Date.now();
    const chunks = await hybridRetrieve(orgId, colId, row.query, k);
    const elapsed = Date.now() - start;

    const expected = new Set(row.expectedDocumentIds);
    const retrievedDocIds = chunks.map((c) => c.documentId);
    const hits = retrievedDocIds.filter((id) => expected.has(id));
    const uniqueHitDocs = new Set(hits);

    const precision = chunks.length === 0 ? 0 : uniqueHitDocs.size / chunks.length;
    const recall = expected.size === 0 ? 0 : uniqueHitDocs.size / expected.size;
    const firstHit = retrievedDocIds.findIndex((id) => expected.has(id));
    const mrr = firstHit === -1 ? 0 : 1 / (firstHit + 1);

    precisionSum += precision;
    recallSum += recall;
    mrrSum += mrr;
    perQuery.push({ query: row.query, precision, recall, mrr });

    process.stdout.write(
      `Q: ${row.query.slice(0, 60).padEnd(60)} P=${precision.toFixed(2)} R=${recall.toFixed(2)} MRR=${mrr.toFixed(2)} (${elapsed}ms)\n`,
    );
  }

  const n = fixture.length;
  console.log("");
  console.log("─".repeat(60));
  console.log(`Queries: ${n}`);
  console.log(`Mean precision@${k}: ${(precisionSum / n).toFixed(3)}`);
  console.log(`Mean recall@${k}:    ${(recallSum / n).toFixed(3)}`);
  console.log(`Mean MRR:            ${(mrrSum / n).toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
