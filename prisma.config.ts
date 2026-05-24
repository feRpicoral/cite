import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma CLI doesn't read .env.local by itself, only .env. Use Next.js's
// own env loader so `prisma migrate` / `prisma db seed` see the same vars
// the app sees at runtime.
loadEnvConfig(process.cwd());

const databaseUrl =
  process.env.DATABASE_URL ??
  // Placeholder so `prisma generate` succeeds without a live DB connection
  // (only the URL string is parsed during generation, never dialed).
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: databaseUrl },
  migrations: {
    path: "prisma/migrations",
  },
});
