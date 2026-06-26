"use client";

import type { CitationVerdict } from "@prisma/client";
import { Check, ChevronDown, type LucideIcon, TriangleAlert, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { ConfidenceBar, VerdictBadge } from "@/components/cite/verdict-badge";
import { cn } from "@/lib/utils";

import type { MessageGroup } from "./aggregate";

const COUNT_PILL: Record<
  CitationVerdict,
  { Icon: LucideIcon; className: string; strokeWidth: number }
> = {
  SUPPORTED: { Icon: Check, className: "bg-success/12 text-success", strokeWidth: 3 },
  PARTIAL: { Icon: TriangleAlert, className: "bg-warning/15 text-warning", strokeWidth: 2.5 },
  UNSUPPORTED: { Icon: X, className: "bg-destructive/15 text-destructive", strokeWidth: 3 },
};

export function AuditRow({ group }: { group: MessageGroup }) {
  const t = useTranslations("audit.row");
  const format = useFormatter();
  const [open, setOpen] = useState(false);

  const audits = [...group.audits].sort((a, b) => a.displayIndex - b.displayIndex);

  return (
    <div className="not-last:border-b">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t("collapse") : t("expand")}
        className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{group.message.conversation.title}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{group.message.content}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <CountPill verdict="SUPPORTED" count={group.counts.supported} />
          <CountPill verdict="PARTIAL" count={group.counts.partial} />
          <CountPill verdict="UNSUPPORTED" count={group.counts.unsupported} />
        </div>

        <span className="text-muted-foreground hidden w-16 shrink-0 text-right font-mono text-[11px] tabular-nums sm:block">
          {format.relativeTime(group.latestAt)}
        </span>

        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-4 pb-4">
          {audits.map((audit) => (
            <div
              key={audit.id}
              className="bg-muted/40 flex flex-col gap-3 rounded-[10px] border p-3 sm:flex-row"
            >
              <span
                className="bg-primary/10 text-primary inline-flex h-[18px] shrink-0 items-center self-start rounded px-1.5 font-mono text-[10px] font-semibold"
                aria-label={t("citationLabel", { index: audit.displayIndex })}
              >
                {audit.displayIndex}
              </span>
              <div className="flex-1 space-y-2">
                {audit.quote && (
                  <p className="border-highlight-border bg-highlight/40 text-highlight-foreground rounded-r border-l-2 px-2.5 py-1.5 text-xs leading-relaxed">
                    “{audit.quote}”
                  </p>
                )}
                <p className="text-foreground/80 text-xs leading-relaxed">{audit.reasoning}</p>
              </div>
              <div className="w-full shrink-0 space-y-2 sm:w-36">
                <VerdictBadge verdict={audit.verdict} />
                <ConfidenceBar value={audit.confidence} verdict={audit.verdict} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CountPill({ verdict, count }: { verdict: CitationVerdict; count: number }) {
  if (count === 0) return null;
  const { Icon, className, strokeWidth } = COUNT_PILL[verdict];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-md px-1.5 font-mono text-[11px] font-semibold tabular-nums",
        className,
      )}
    >
      {count}
      <Icon className="size-2.5" strokeWidth={strokeWidth} />
    </span>
  );
}
