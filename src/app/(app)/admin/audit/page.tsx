import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth/session";

import { AuditList } from "./audit-list";
import { AuditSkeleton } from "./audit-skeleton";
import { parseAuditSearchParams, type RawAuditSearchParams } from "./params";

const DATE_RANGE_DAYS = 30;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<RawAuditSearchParams>;
}) {
  const session = await requireAdmin();
  const t = await getTranslations("audit");
  const params = parseAuditSearchParams(await searchParams);

  const suspenseKey = `${params.verdict ?? ""}|${params.sort ?? ""}|${params.search ?? ""}`;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="font-heading text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-xs">{t("subtitle")}</p>
        </div>
        <span className="text-muted-foreground hidden shrink-0 font-mono text-[11px] tabular-nums sm:inline">
          {t("dateRange", { days: DATE_RANGE_DAYS })}
        </span>
      </header>

      <div className="flex-1 p-6">
        <Suspense key={suspenseKey} fallback={<AuditSkeleton />}>
          <AuditList orgId={session.orgId} params={params} />
        </Suspense>
      </div>
    </div>
  );
}
