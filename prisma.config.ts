import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma CLI doesn't read .env.local by itself, only .env. Use Next.js's
// own env loader so `prisma migrate` / `prisma db seed` see the same vars
// the app sees at runtime.
loadEnvConfig(process.cwd());

// Migrations must use the direct connection. Supabase's Transaction Pooler
// (DATABASE_URL) runs in pgBouncer transaction mode, which strips the
// session state DDL relies on (CREATE EXTENSION, advisory locks Prisma
// uses to serialize migrations). Fall back to DATABASE_URL only so
// `prisma generate` succeeds in environments where DIRECT_URL isn't set
// (the URL is parsed but never dialed during generation).
const migrationUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: migrationUrl },
  migrations: {
    path: "prisma/migrations",
  },
});
