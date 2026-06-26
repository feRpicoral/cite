"use client";

import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";

export function NoAnswer({ text }: { text: string }) {
  const t = useTranslations("conversation.noAnswer");

  return (
    <div className="flex gap-3">
      <div className="bg-warning/15 text-warning flex size-8 shrink-0 items-center justify-center rounded-lg">
        <SearchX className="size-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-foreground font-semibold">{t("title")}</p>
        <p className="text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
          {text.trim().length > 0 ? text : t("body")}
        </p>
      </div>
    </div>
  );
}
