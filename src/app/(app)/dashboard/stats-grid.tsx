import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import type { DashboardSummary } from "@/lib/db/dashboard";
import { cn } from "@/lib/utils";

interface StatsGridProps {
  counts: DashboardSummary["counts"];
  accuracy: DashboardSummary["accuracy"];
  isAdmin: boolean;
  numberFormat: Intl.NumberFormat;
}

export async function StatsGrid({ counts, accuracy, isAdmin, numberFormat }: StatsGridProps) {
  const t = await getTranslations("dashboard.stats");

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label={t("collections")} value={numberFormat.format(counts.collections)} />
      <StatCard
        label={t("documents")}
        value={numberFormat.format(counts.documents)}
        subtext={
          counts.documentsInProgress > 0 || counts.documentsFailed > 0 ? (
            <span className="text-warning">
              {t("documentsSubtext", {
                embedding: counts.documentsInProgress,
                failed: counts.documentsFailed,
              })}
            </span>
          ) : undefined
        }
      />
      <StatCard label={t("conversations")} value={numberFormat.format(counts.conversations)} />
      {isAdmin && (
        <StatCard
          label={t("accuracy")}
          value={`${accuracy.supportedPct}%`}
          valueClassName="text-success"
          subtext={
            accuracy.total > 0
              ? t("accuracySubtext", { audited: numberFormat.format(accuracy.total) })
              : undefined
          }
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  valueClassName,
}: {
  label: string;
  value: string;
  subtext?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card size="sm" className="gap-0 px-4 py-4">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground font-mono text-[10px] font-semibold tracking-[0.1em] uppercase">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "mt-2 font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </div>
      {subtext && <div className="mt-1.5 text-[11px] font-medium">{subtext}</div>}
    </Card>
  );
}
