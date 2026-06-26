"use client";

import { useTranslations } from "next-intl";

type Status = "submitted" | "streaming" | "ready" | "error";

export function StreamingStatus({ status }: { status: Status }) {
  const t = useTranslations("conversation.streaming");
  if (status !== "submitted" && status !== "streaming") return null;
  const label = status === "submitted" ? t("searching") : t("synthesizing");

  return (
    <span className="text-primary inline-flex items-center gap-2 text-[11px] font-medium">
      <span className="inline-flex gap-1">
        <span className="animate-cite-pulse size-1 rounded-full bg-current" />
        <span className="animate-cite-pulse size-1 rounded-full bg-current [animation-delay:0.2s]" />
        <span className="animate-cite-pulse size-1 rounded-full bg-current [animation-delay:0.4s]" />
      </span>
      {label}
    </span>
  );
}
