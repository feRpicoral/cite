import { getTranslations } from "next-intl/server";

import { FormatBadge } from "@/components/cite/format-badge";
import { IngestionStatus } from "@/components/cite/ingestion-status";
import { Card } from "@/components/ui/card";
import type { RecentDocument } from "@/lib/db/dashboard";

export async function RecentlyIndexed({ documents }: { documents: RecentDocument[] }) {
  const t = await getTranslations("dashboard.recentlyIndexed");

  return (
    <Card className="gap-0 py-0">
      <div className="flex h-11 items-center border-b px-4">
        <span className="font-heading text-sm font-semibold">{t("title")}</span>
      </div>
      {documents.length === 0 ? (
        <p className="text-muted-foreground px-4 py-8 text-center text-sm">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <FormatBadge format={d.format} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{d.name}</span>
              <IngestionStatus status={d.status} className="shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
