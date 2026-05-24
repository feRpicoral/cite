/**
 * Apply prisma/sql/setup.sql against the configured DATABASE_URL.
 * Run after `prisma migrate deploy` to (re)install the trigger + RLS policies.
 *
 *   yarn db:setup
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) {
    throw new Error("DATABASE_URL or DIRECT_URL is required");
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
