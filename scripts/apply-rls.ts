/**
 * Apply prisma/sql/setup.sql against the configured Postgres.
 * Run after `prisma migrate deploy` to (re)install the trigger + RLS policies.
 *
 *   yarn db:setup
 *
 * Prefers DIRECT_URL because setup.sql contains DDL (CREATE EXTENSION,
 * CREATE FUNCTION) that needs session state pgBouncer's transaction mode
 * strips. Falls back to DATABASE_URL only when DIRECT_URL is unset (local
 * dev against a non-pooled Postgres).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL is required");
  }
  const sql = readFileSync(join(process.cwd(), "prisma", "sql", "setup.sql"), "utf-8");

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Applied prisma/sql/setup.sql");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
