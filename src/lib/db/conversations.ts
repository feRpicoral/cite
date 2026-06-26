import "server-only";

import type { OrgId } from "./types";
import { getDb } from "./with-org";

const DEFAULT_PAGE_SIZE = 50;

export interface ListConversationsParams {
  search?: string;
  collectionId?: string;
  limit?: number;
  offset?: number;
}

export interface ConversationListRow {
  id: string;
  title: string;
  updatedAt: Date;
  collection: { id: string; name: string };
  createdByUserId: string;
  messageCount: number;
}

export interface ListConversationsResult {
  rows: ConversationListRow[];
  total: number;
  hasMore: boolean;
}

export async function listConversations(
  orgId: OrgId,
  params: ListConversationsParams = {},
): Promise<ListConversationsResult> {
  const db = getDb(orgId);

  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const search = params.search?.trim();

  const where = {
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    ...(params.collectionId ? { collectionId: params.collectionId } : {}),
  };

  const [conversations, total] = await Promise.all([
    db.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdByUserId: true,
        collection: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    }),
    db.conversation.count({ where }),
  ]);

  const rows = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    collection: c.collection,
    createdByUserId: c.createdByUserId,
    messageCount: c._count.messages,
  }));

  return { rows, total, hasMore: offset + rows.length < total };
}
