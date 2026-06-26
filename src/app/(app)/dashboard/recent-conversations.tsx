import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { RecentConversation } from "@/lib/db/dashboard";

import { formatRelativeTime } from "./format-time";

export async function RecentConversations({
  conversations,
  locale,
}: {
  conversations: RecentConversation[];
  locale: Locale;
}) {
  const t = await getTranslations("dashboard.recentConversations");
  const now = new Date();

  return (
    <Card className="gap-0 py-0">
      <div className="flex h-11 items-center border-b px-4">
        <span className="font-heading text-sm font-semibold">{t("title")}</span>
        <Link href="/conversations" className="text-primary ml-auto text-xs font-semibold">
          {t("viewAll")}
        </Link>
      </div>
      {conversations.length === 0 ? (
        <p className="text-muted-foreground px-4 py-8 text-center text-sm">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/conversations/${c.id}`}
                className="hover:bg-muted/40 flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{c.title}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    {c.collectionName}
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                  {formatRelativeTime(c.updatedAt, locale, now)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
