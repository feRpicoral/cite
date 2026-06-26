import { Check, type LucideIcon, TriangleAlert, X } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";

import type { aggregateOf } from "./aggregate";

type Aggregate = ReturnType<typeof aggregateOf>;

const STAT: Record<
  "supported" | "partial" | "unsupported",
  { Icon: LucideIcon; bar: string; iconBg: string; text: string; strokeWidth: number }
> = {
  supported: {
    Icon: Check,
    bar: "bg-success",
    iconBg: "bg-success/14 text-success",
    text: "text-success",
    strokeWidth: 2.6,
  },
  partial: {
    Icon: TriangleAlert,
    bar: "bg-warning",
    iconBg: "bg-warning/16 text-warning",
    text: "text-warning",
    strokeWidth: 2.2,
  },
  unsupported: {
    Icon: X,
    bar: "bg-destructive",
    iconBg: "bg-destructive/12 text-destructive",
    text: "text-destructive",
    strokeWidth: 2.6,
  },
};

export async function AuditSummary({
  aggregate,
  messageCount,
}: {
  aggregate: Aggregate;
  messageCount: number;
}) {
  const t = await getTranslations("audit");
  const format = new Intl.NumberFormat();

  return (
    <Card className="gap-0 p-5">
      <div className="mb-3.5 flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("summary.title")}</h2>
        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {t("summary.meta", {
            citations: format.format(aggregate.total),
            messages: format.format(messageCount),
          })}
        </span>
      </div>

      <div
        className="bg-muted flex h-3 overflow-hidden rounded-full"
        role="img"
        aria-label={t("summary.meta", {
          citations: format.format(aggregate.total),
          messages: format.format(messageCount),
        })}
      >
        <Segment className={STAT.supported.bar} pct={aggregate.supportedPct} />
        <Segment className={STAT.partial.bar} pct={aggregate.partialPct} />
        <Segment className={STAT.unsupported.bar} pct={aggregate.unsupportedPct} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Stat
          tone="supported"
          pct={aggregate.supportedPct}
          label={t("stat.supported", { count: format.format(aggregate.supported) })}
        />
        <Stat
          tone="partial"
          pct={aggregate.partialPct}
          label={t("stat.partial", { count: format.format(aggregate.partial) })}
        />
        <Stat
          tone="unsupported"
          pct={aggregate.unsupportedPct}
          label={t("stat.unsupported", { count: format.format(aggregate.unsupported) })}
        />
      </div>
    </Card>
  );
}

function Segment({ className, pct }: { className: string; pct: number }) {
  if (pct === 0) return null;
  return <div className={className} style={{ width: `${pct}%` }} />;
}

function Stat({ tone, pct, label }: { tone: keyof typeof STAT; pct: number; label: string }) {
  const { Icon, iconBg, text, strokeWidth } = STAT[tone];
  return (
    <div className="flex items-center gap-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${iconBg}`}>
        <Icon className="size-[18px]" strokeWidth={strokeWidth} />
      </span>
      <div>
        <p className={`font-mono text-2xl font-semibold tracking-tight tabular-nums ${text}`}>
          {pct}%
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">{label}</p>
      </div>
    </div>
  );
}
