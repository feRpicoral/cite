"use client";

import { ArrowUp, CircleAlert, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MAX_MESSAGE_LENGTH = 8_000;

interface ChatComposerProps {
  onSend: (text: string) => void;
  busy?: boolean;
  onStop?: () => void;
  placeholder: string;
}

export function ChatComposer({ onSend, busy, onStop, placeholder }: ChatComposerProps) {
  const t = useTranslations("conversation.composer");
  const [value, setValue] = useState("");

  const length = value.length;
  const overBy = length - MAX_MESSAGE_LENGTH;
  const tooLong = overBy > 0;
  const canSend = value.trim().length > 0 && !tooLong && !busy;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || tooLong || busy) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-2.5 rounded-xl border px-3 py-2.5 shadow-xs transition-shadow",
        tooLong
          ? "border-destructive ring-destructive/15 ring-3"
          : "focus-within:border-ring focus-within:ring-ring/25 focus-within:ring-3",
      )}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={busy ? t("generating") : placeholder}
        disabled={busy}
        className="placeholder:text-muted-foreground max-h-40 min-h-[24px] w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none disabled:opacity-70"
      />
      <div className="flex items-center gap-3">
        {tooLong ? (
          <span className="text-destructive inline-flex items-center gap-1.5 text-[11px] font-medium">
            <CircleAlert className="size-3" strokeWidth={2.2} />
            {t("tooLong", { count: overBy })}
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-[10px]">{t("hint")}</span>
        )}
        <span
          className={cn(
            "ml-auto font-mono text-[10px] tabular-nums",
            tooLong ? "text-destructive font-semibold" : "text-muted-foreground",
          )}
        >
          {t("counter", { count: length, max: MAX_MESSAGE_LENGTH })}
        </span>
        {busy && onStop ? (
          <Button type="button" variant="outline" size="sm" onClick={onStop}>
            <Square className="fill-current" />
            {t("stop")}
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!canSend}
            aria-label={t("send")}
          >
            <ArrowUp />
          </Button>
        )}
      </div>
    </div>
  );
}
