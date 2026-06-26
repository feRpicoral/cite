"use client";

import { Check, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { TraceData, TracePhase } from "@/lib/chat/trace";

interface PhaseRow {
  key: string;
  title: string;
  subtitle?: string;
  status: TracePhase["status"];
}

export function LiveReasoningTrace({ trace }: { trace: TraceData }) {
  const t = useTranslations("conversation.reasoning.live");

  const rows: PhaseRow[] = trace.phases.map((phase) => describe(phase, t));
  if (rows.length === 0) return null;

  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <div className="flex h-[38px] items-center gap-2 border-b px-3.5">
        <Settings2 className="text-primary size-3.5" strokeWidth={2} />
        <span className="text-foreground/80 text-[11.5px] font-semibold">{t("heading")}</span>
      </div>
      <ol className="flex flex-col gap-3.5 px-4 py-3.5">
        {rows.map((row, i) => (
          <li key={row.key} className="flex gap-2.5">
            <div className="flex flex-col items-center gap-1">
              <PhaseNode status={row.status} />
              {i < rows.length - 1 && <span className="bg-border w-px flex-1" />}
            </div>
            <div className="min-w-0 pb-0.5">
              <div className="text-foreground/85 text-[12.5px] leading-tight font-semibold">
                {row.title}
              </div>
              {row.subtitle && (
                <div className="text-muted-foreground mt-0.5 text-[11.5px] leading-snug">
                  {row.subtitle}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PhaseNode({ status }: { status: TracePhase["status"] }) {
  if (status === "done") {
    return (
      <span className="bg-success/15 flex size-[18px] items-center justify-center rounded-full">
        <Check className="text-success size-[11px]" strokeWidth={3.5} />
      </span>
    );
  }
  return (
    <span className="bg-card ring-warning flex size-[18px] items-center justify-center rounded-full ring-2 ring-inset">
      <span className="animate-cite-spin border-warning size-3 rounded-full border-[1.5px] border-t-transparent" />
    </span>
  );
}

function describe(phase: TracePhase, t: ReturnType<typeof useTranslations>): PhaseRow {
  switch (phase.kind) {
    case "classify":
      return {
        key: "classify",
        status: phase.status,
        title:
          phase.status === "done"
            ? phase.shape === "decompose"
              ? t("classifyDoneDecompose")
              : t("classifyDoneSimple")
            : t("classifyTitle"),
      };
    case "decompose":
      return {
        key: "decompose",
        status: phase.status,
        title:
          phase.status === "done"
            ? t("decomposeDone", { count: phase.subQueries.length })
            : t("decomposeActive"),
        subtitle: phase.subQueries.length > 0 ? phase.subQueries.join(" · ") : undefined,
      };
    case "retrieve":
      return {
        key: "retrieve",
        status: phase.status,
        title: t("retrieveTitle"),
        subtitle:
          phase.status === "done"
            ? t("retrieveDone", { candidates: phase.candidates, reranked: phase.reranked })
            : t("retrieveActive"),
      };
    case "sufficiency":
      return {
        key: "sufficiency",
        status: phase.status,
        title: t("sufficiencyTitle"),
        subtitle:
          phase.status === "done"
            ? phase.verdict === "insufficient"
              ? t("sufficiencyShort")
              : t("sufficiencyMet")
            : undefined,
      };
    case "synthesize":
      return {
        key: "synthesize",
        status: phase.status,
        title: t("synthesizeTitle"),
        subtitle: t("synthesizeSubtitle"),
      };
  }
}
