"use client";

import { Check, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { InitialCitation } from "@/app/(app)/conversations/[id]/chat-panel";

export function SupportFooter({ citations }: { citations: InitialCitation[] }) {
  const t = useTranslations("conversation.support");

  let supported = 0;
  let partial = 0;
  let unsupported = 0;
  for (const c of citations) {
    if (c.verdict === "SUPPORTED") supported += 1;
    else if (c.verdict === "PARTIAL") partial += 1;
    else if (c.verdict === "UNSUPPORTED") unsupported += 1;
  }

  if (supported + partial + unsupported === 0) return null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] font-medium">
      {supported > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <Check className="text-success size-3.5" strokeWidth={2.75} />
          {t("supported", { count: supported })}
        </span>
      )}
      {partial > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <TriangleAlert className="text-warning size-3.5" strokeWidth={2.4} />
          {t("partial", { count: partial })}
        </span>
      )}
      {unsupported > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <X className="text-destructive size-3.5" strokeWidth={2.4} />
          {t("unsupported", { count: unsupported })}
        </span>
      )}
    </div>
  );
}
