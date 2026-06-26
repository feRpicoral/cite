import "server-only";

import type { CitationVerdict, DocumentFormat, DocumentStatus } from "@prisma/client";

import type { OrgId } from "./types";
import { getDb } from "./with-org";

const IN_PROGRESS_STATUSES: DocumentStatus[] = ["UPLOADING", "EXTRACTING", "CHUNKING", "EMBEDDING"];

const DEFAULT_RECENT_LIMIT = 5;

export interface DashboardSummaryParams {
  recentLimit?: number;
}

export interface AccuracySummary {
  total: number;
  supported: number;
  partial: number;
  unsupported: number;
  supportedPct: number;
  partialPct: number;
  unsupportedPct: number;
}

export interface RecentConversation {
  id: string;
  title: string;
  updatedAt: Date;
  collectionName: string;
}

export interface RecentDocument {
  id: string;
  name: string;
  format: DocumentFormat;
  status: DocumentStatus;
  indexedAt: Date | null;
}

export interface DashboardSummary {
  counts: {
    collections: number;
    documents: number;
    documentsInProgress: number;
    documentsFailed: number;
    conversations: number;
  };
  accuracy: AccuracySummary;
  recentConversations: RecentConversation[];
  recentDocuments: RecentDocument[];
}

export async function getDashboardSummary(
  orgId: OrgId,
  params: DashboardSummaryParams = {},
): Promise<DashboardSummary> {
  const db = getDb(orgId);
  const recentLimit = params.recentLimit ?? DEFAULT_RECENT_LIMIT;

  const [
    collections,
    documents,
    documentsInProgress,
    documentsFailed,
    conversations,
    verdictGroups,
    recentConversationRows,
    recentDocumentRows,
  ] = await Promise.all([
    db.collection.count(),
    db.document.count(),
    db.document.count({ where: { status: { in: IN_PROGRESS_STATUSES } } }),
    db.document.count({ where: { status: "FAILED" } }),
    db.conversation.count(),
    db.citationAudit.groupBy({ by: ["verdict"], _count: { _all: true } }),
    db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: recentLimit,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        collection: { select: { name: true } },
      },
    }),
    db.document.findMany({
      where: { indexedAt: { not: null } },
      orderBy: { indexedAt: "desc" },
      take: recentLimit,
      select: { id: true, name: true, format: true, status: true, indexedAt: true },
    }),
  ]);

  return {
    counts: {
      collections,
      documents,
      documentsInProgress,
      documentsFailed,
      conversations,
    },
    accuracy: summarizeVerdicts(verdictGroups),
    recentConversations: recentConversationRows.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      collectionName: c.collection.name,
    })),
    recentDocuments: recentDocumentRows.map((d) => ({
      id: d.id,
      name: d.name,
      format: d.format,
      status: d.status,
      indexedAt: d.indexedAt,
    })),
  };
}

type VerdictGroup = { verdict: CitationVerdict; _count: { _all: number } };

export function summarizeVerdicts(groups: VerdictGroup[]): AccuracySummary {
  const countOf = (verdict: CitationVerdict) =>
    groups.find((g) => g.verdict === verdict)?._count._all ?? 0;

  const supported = countOf("SUPPORTED");
  const partial = countOf("PARTIAL");
  const unsupported = countOf("UNSUPPORTED");
  const total = supported + partial + unsupported;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return {
    total,
    supported,
    partial,
    unsupported,
    supportedPct: pct(supported),
    partialPct: pct(partial),
    unsupportedPct: pct(unsupported),
  };
}
