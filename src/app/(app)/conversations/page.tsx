import { FolderPlus, MessagesSquare, Search } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/cite/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { listConversations } from "@/lib/db/conversations";
import { getDb } from "@/lib/db/with-org";

import { ConversationsToolbar } from "./conversations-toolbar";
import { LoadMore } from "./load-more";
import { NewConversationButton } from "./new-conversation-button";

const DEFAULT_TAKE = 25;

interface ConversationsPageProps {
  searchParams: Promise<{ q?: string; collection?: string; take?: string }>;
}

export default async function ConversationsPage({ searchParams }: ConversationsPageProps) {
  const { q, collection, take } = await searchParams;
  const session = await requireSession();
  const [t, locale] = await Promise.all([getTranslations("conversationsList"), getLocale()]);
  const db = getDb(session.orgId);

  const search = q?.trim() || undefined;
  const collectionId = collection || undefined;
  const limit = clampTake(take);

  const [collections, members, statusCounts, list] = await Promise.all([
    db.collection.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, _count: { select: { documents: true } } },
    }),
    db.membership.findMany({ select: { user: { select: { id: true, name: true, email: true } } } }),
    db.document.groupBy({ by: ["collectionId"], where: { status: "INDEXED" }, _count: true }),
    listConversations(session.orgId, { search, collectionId, limit }),
  ]);

  const creators = new Map(members.map((m) => [m.user.id, m.user.name ?? m.user.email]));
  const indexedByCollection = new Map(statusCounts.map((s) => [s.collectionId, s._count]));
  const dialogCollections = collections.map((c) => ({
    id: c.id,
    name: c.name,
    documentCount: c._count.documents,
    indexedCount: indexedByCollection.get(c.id) ?? 0,
  }));

  const hasFilters = Boolean(search || collectionId);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <h1 className="font-heading text-base font-semibold tracking-tight">{t("title")}</h1>
        <div className="ml-auto">
          <NewConversationButton collections={dialogCollections} />
        </div>
      </header>

      {collections.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            tone="warning"
            icon={<FolderPlus />}
            title={t("noCollections.title")}
            description={t("noCollections.description")}
          >
            <Button asChild>
              <Link href="/documents">{t("noCollections.createCollection")}</Link>
            </Button>
          </EmptyState>
        </div>
      ) : (
        <div className="flex flex-1 flex-col p-4 sm:p-6">
          <ConversationsToolbar
            collections={collections.map((c) => ({ id: c.id, name: c.name }))}
            total={list.total}
          />

          {list.rows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              {hasFilters ? (
                <EmptyState
                  icon={<Search />}
                  title={t("noResults.title")}
                  description={
                    search
                      ? t("noResults.description", { query: search })
                      : t("noResults.descriptionFiltered")
                  }
                >
                  <Button variant="outline" asChild>
                    <Link href="/conversations">{t("clearSearch")}</Link>
                  </Button>
                </EmptyState>
              ) : (
                <EmptyState
                  tone="primary"
                  icon={<MessagesSquare />}
                  title={t("noneYet.title")}
                  description={t("noneYet.description")}
                >
                  <NewConversationButton collections={dialogCollections} />
                </EmptyState>
              )}
            </div>
          ) : (
            <>
              <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border">
                {list.rows.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/conversations/${row.id}`}
                      className="hover:bg-muted/40 flex items-center gap-4 px-4 py-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{row.title}</p>
                        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="font-normal">
                            {row.collection.name}
                          </Badge>
                          <span>{t("messageCount", { count: row.messageCount })}</span>
                        </div>
                      </div>
                      <Avatar size="sm">
                        <AvatarFallback className="text-[0.625rem]">
                          {initials(creators.get(row.createdByUserId))}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                        {formatRelative(row.updatedAt, locale)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {list.hasMore && (
                <div className="mt-4 flex justify-center">
                  <LoadMore nextTake={limit + DEFAULT_TAKE} label={t("loadMore")} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function clampTake(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < DEFAULT_TAKE) return DEFAULT_TAKE;
  return Math.min(Math.floor(parsed), 500);
}

function initials(source: string | undefined): string {
  if (!source) return "?";
  return (
    source
      .split(/[\s.@-]+/)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "?"
  );
}

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

function formatRelative(date: Date, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), "year");
}
