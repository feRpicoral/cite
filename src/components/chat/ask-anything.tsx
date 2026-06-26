"use client";

import { MessagesSquare, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/cite/empty-state";

export function AskAnything({
  collectionName,
  onPickSuggestion,
}: {
  collectionName: string;
  onPickSuggestion: (text: string) => void;
}) {
  const t = useTranslations("conversation.empty");
  const suggestions = [t("suggestion1"), t("suggestion2")];

  return (
    <EmptyState
      icon={<MessagesSquare />}
      tone="primary"
      title={t("title", { collection: collectionName })}
      description={t("description")}
      className="max-w-md py-16"
    >
      <div className="flex w-full flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPickSuggestion(s)}
            className="bg-card hover:bg-accent flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium shadow-xs transition-colors"
          >
            <Search className="text-muted-foreground size-3.5 shrink-0" strokeWidth={2} />
            {s}
          </button>
        ))}
      </div>
    </EmptyState>
  );
}
