#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

import { requireEnv } from "@/lib/env";

loadEnvConfig(process.cwd());

async function main() {
  const url = requireEnv("DIRECT_URL");
  if (!url) {
    throw new Error("DIRECT_URL is required");
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
