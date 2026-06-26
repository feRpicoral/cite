import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import type { AccuracySummary } from "@/lib/db/dashboard";

export async function AccuracyCard({ accuracy }: { accuracy: AccuracySummary }) {
  const t = await getTranslations("dashboard.accuracyCard");
  const tStats = await getTranslations("dashboard.stats");
  const hasData = accuracy.total > 0;

  return (
    <Card size="sm" className="gap-0 px-4 py-4">
      <div className="flex items-center gap-1.5">
        <span className="font-heading text-sm font-semibold">{t("title")}</span>
        <span className="text-muted-foreground bg-muted rounded-[3px] px-1 py-0.5 font-mono text-[8px] font-semibold">
          {tStats("adminBadge")}
        </span>
        <Link href="/admin/audit" className="text-primary ml-auto text-xs font-semibold">
          {t("openAudit")}
        </Link>
      </div>

      {hasData ? (
        <>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
            <div className="bg-success" style={{ width: `${accuracy.supportedPct}%` }} />
            <div className="bg-warning" style={{ width: `${accuracy.partialPct}%` }} />
            <div className="bg-destructive" style={{ width: `${accuracy.unsupportedPct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5">
            <Legend swatch="bg-success" label={t("supported", { pct: accuracy.supportedPct })} />
            <Legend swatch="bg-warning" label={t("partial", { pct: accuracy.partialPct })} />
            <Legend
              swatch="bg-destructive"
              label={t("unsupported", { pct: accuracy.unsupportedPct })}
            />
          </div>
        </>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">{t("empty")}</p>
      )}
    </Card>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-medium">
      <span className={`size-[7px] rounded-[2px] ${swatch}`} />
      {label}
    </span>
  );
}
