import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var __citePrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill in.");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

export function getPrisma(): PrismaClient {
  if (globalThis.__citePrisma) return globalThis.__citePrisma;
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__citePrisma = client;
  }
  return client;
}
