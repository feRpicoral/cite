"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

import type { ReasoningSummary } from "./reasoning";

export function ReasoningTrace({ summary }: { summary: ReasoningSummary }) {
  const t = useTranslations("conversation.reasoning");
  const [open, setOpen] = useState(false);

  const shapeLabel = summary.shape === "decompose" ? t("shapeDecompose") : t("shapeSimple");
  const parts = [
    t("classified", { shape: shapeLabel }),
    t("subQueries", { count: summary.subQueries.length }),
  ];
  if (summary.reranked) parts.push(t("reranked"));
  parts.push(summary.sufficient ? t("sufficiencyMet") : t("sufficiencyShort"));

  return (
    <div className="self-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t("ariaCollapse") : t("ariaExpand")}
        className="bg-card text-muted-foreground hover:text-foreground inline-flex h-[26px] items-center gap-2 rounded-lg border px-2.5 text-[11px] font-medium shadow-xs transition-colors"
      >
        <Sparkles className="text-primary size-3.5" strokeWidth={2} />
        <span>{parts.join(" · ")}</span>
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          strokeWidth={2}
        />
      </button>
      {open && summary.subQueries.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {summary.subQueries.map((q, i) => (
            <span
              key={`${i}-${q}`}
              className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-[10.5px]"
            >
              {q}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
