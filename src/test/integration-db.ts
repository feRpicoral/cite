import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

const SETUP_SQL_PATH = join(process.cwd(), "prisma", "sql", "setup.sql");

/**
 * Spins up a Prisma client pointed at INTEGRATION_DATABASE_URL, ensures the
 * schema + pgvector + RLS policies are in place, and returns the client +
 * a cleanup helper. Each test file gets its own client to avoid cross-test
 * pool contention.
 */
export async function setupIntegrationDb(): Promise<{
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}> {
  const url = process.env.INTEGRATION_DATABASE_URL;
  if (!url) {
    throw new Error(
      "INTEGRATION_DATABASE_URL is required for integration tests. Set it locally or rely on the CI postgres service.",
    );
  }

  // One-shot client so the setup SQL doesn't share a transaction with test queries.
  const setupSql = readFileSync(SETUP_SQL_PATH, "utf-8");
  const admin = new Client({ connectionString: url });
  await admin.connect();
  try {
    await admin.query(setupSql);
  } finally {
    await admin.end();
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter, log: ["error"] });

  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
    },
  };
}

/**
 * Truncates every tenant table. Faster than dropping and re-migrating between tests.
 */
export async function truncateAllTenantTables(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE
      public.message_citations,
      public.citation_audits,
      public.message_metrics,
      public.messages,
      public.conversations,
      public.embeddings,
      public.document_chunks,
      public.document_parts,
      public.documents,
      public.collections,
      public.comment_replies,
      public.comments,
      public.invites,
      public.memberships,
      public.organizations,
      public.users
    RESTART IDENTITY CASCADE;
  `);
}
