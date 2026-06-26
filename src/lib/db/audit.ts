import "server-only";

import type { CitationVerdict, Prisma } from "@prisma/client";

import type { OrgId } from "./types";
import { getDb } from "./with-org";

const DEFAULT_LIMIT = 100;
const DEFAULT_DATE_RANGE_DAYS = 30;

export type AuditSort = "recent" | "confidence";

export interface ListAuditsParams {
  verdict?: CitationVerdict;
  sort?: AuditSort;
  search?: string;
  dateRangeDays?: number;
  limit?: number;
}

export interface AuditRow {
  id: string;
  messageId: string;
  displayIndex: number;
  verdict: CitationVerdict;
  reasoning: string;
  confidence: number;
  createdAt: Date;
  message: {
    id: string;
    content: string;
    createdAt: Date;
    conversation: { id: string; title: string };
  } | null;
}

export interface ListAuditsResult {
  audits: AuditRow[];
}

export async function listAudits(
  orgId: OrgId,
  params: ListAuditsParams = {},
): Promise<ListAuditsResult> {
  const db = getDb(orgId);

  const limit = params.limit ?? DEFAULT_LIMIT;
  const dateRangeDays = params.dateRangeDays ?? DEFAULT_DATE_RANGE_DAYS;
  const since = new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000);
  const search = params.search?.trim();

  const where: Prisma.CitationAuditWhereInput = {
    createdAt: { gte: since },
    ...(params.verdict ? { verdict: params.verdict } : {}),
  };

  // CitationAudit has no relation to Message in the schema, so a free-text
  // search over message content or cited document names is resolved by first
  // collecting the matching message ids, then constraining audits to them.
  if (search) {
    const matchingMessages = await db.message.findMany({
      where: {
        OR: [
          { content: { contains: search, mode: "insensitive" } },
          {
            citations: {
              some: { chunk: { document: { name: { contains: search, mode: "insensitive" } } } },
            },
          },
        ],
      },
      select: { id: true },
    });
    where.messageId = { in: matchingMessages.map((m) => m.id) };
  }

  const orderBy: Prisma.CitationAuditOrderByWithRelationInput =
    params.sort === "confidence" ? { confidence: "asc" } : { createdAt: "desc" };

  const audits = await db.citationAudit.findMany({ where, orderBy, take: limit });

  const messageIds = Array.from(new Set(audits.map((a) => a.messageId)));
  const messages = await db.message.findMany({
    where: { id: { in: messageIds } },
    select: {
      id: true,
      content: true,
      createdAt: true,
      conversation: { select: { id: true, title: true } },
    },
  });
  const messageById = new Map(messages.map((m) => [m.id, m]));

  return {
    audits: audits.map((a) => ({
      id: a.id,
      messageId: a.messageId,
      displayIndex: a.displayIndex,
      verdict: a.verdict,
      reasoning: a.reasoning,
      confidence: a.confidence,
      createdAt: a.createdAt,
      message: messageById.get(a.messageId) ?? null,
    })),
  };
}
