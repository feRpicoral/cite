import { getPrisma } from "./client";
import type { OrgId } from "./types";

// Models that carry `orgId` and must be auto-scoped at the app layer. Update
// this set when new tenant tables are added to schema.prisma.
const MULTI_TENANT_MODELS = new Set<string>([
  "Invite",
  "Collection",
  "Document",
  "DocumentPart",
  "DocumentChunk",
  "Embedding",
  "Conversation",
  "Message",
  "MessageCitation",
]);

const READ_OR_MUTATE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

const CREATE_ONE_OPS = new Set(["create"]);
const CREATE_MANY_OPS = new Set(["createMany", "createManyAndReturn"]);

/**
 * Returns a Prisma client extended to auto-inject `orgId` on every operation
 * against a multi-tenant model. Reads/updates/deletes get `where.orgId = orgId`
 * injected; creates get `data.orgId = orgId` injected; upserts get both.
 *
 * Non-tenant models (User, Organization, Membership) pass through unmodified —
 * callers should use `getPrisma()` directly for those.
 */
export function getDb(orgId: OrgId) {
  return getPrisma().$extends({
    name: "with-org",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !MULTI_TENANT_MODELS.has(model)) {
            return query(args);
          }

          const op = operation as string;
          const a = args as Record<string, unknown>;

          if (READ_OR_MUTATE_OPS.has(op)) {
            a.where = { ...((a.where as object | undefined) ?? {}), orgId };
          } else if (CREATE_ONE_OPS.has(op)) {
            a.data = { ...((a.data as object | undefined) ?? {}), orgId };
          } else if (CREATE_MANY_OPS.has(op)) {
            const data = a.data;
            if (Array.isArray(data)) {
              a.data = data.map((d) => ({ ...(d as object), orgId }));
            } else if (data && typeof data === "object") {
              a.data = { ...(data as object), orgId };
            }
          } else if (op === "upsert") {
            a.where = { ...((a.where as object | undefined) ?? {}), orgId };
            a.create = { ...((a.create as object | undefined) ?? {}), orgId };
          }

          return query(args);
        },
      },
    },
  });
}
