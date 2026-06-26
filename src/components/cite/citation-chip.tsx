"use client";

import type { CitationVerdict, DocumentFormat } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { FormatBadge } from "./format-badge";
import { VerdictBadge } from "./verdict-badge";

export interface CitationPreview {
  documentName: string;
  format?: DocumentFormat;
  page?: number | null;
  quote: string;
  verdict?: CitationVerdict | null;
  confidence?: number | null;
}

type ChipState = "pending" | "default" | "open";

const STATE_CLASS: Record<ChipState, string> = {
  default: "bg-primary/10 text-primary ring-primary/25 hover:bg-primary/15 cursor-pointer",
  open: "bg-highlight text-highlight-foreground ring-highlight-border cursor-pointer",
  pending: "bg-muted text-muted-foreground ring-border cursor-default",
};

const PREVIEW_CLOSE_DELAY_MS = 80;

export function CitationChip({
  index,
  state = "default",
  onActivate,
  preview,
  className,
}: {
  index: number;
  state?: ChipState;
  onActivate?: () => void;
  preview?: CitationPreview;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (preview && state !== "pending") setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), PREVIEW_CLOSE_DELAY_MS);
  };

  const chip = (
    <button
      type="button"
      disabled={state === "pending"}
      onClick={state === "pending" ? undefined : onActivate}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-label={state === "pending" ? "Citation pending" : `Open citation ${index}`}
      className={cn(
        "mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center gap-1 rounded-[5px] px-1.5 align-baseline font-mono text-[11px] leading-none font-semibold ring-1 transition-colors ring-inset",
        STATE_CLASS[state],
        className,
      )}
    >
      {state === "pending" ? (
        <span className="animate-cite-pulse size-1 rounded-full bg-current" />
      ) : (
        index
      )}
    </button>
  );

  if (!preview || state === "pending") return chip;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>{chip}</PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        onMouseEnter={show}
        onMouseLeave={hide}
        className="w-72"
      >
        <div className="flex items-center gap-2">
          {preview.format && <FormatBadge format={preview.format} />}
          <span className="truncate text-xs font-semibold">{preview.documentName}</span>
          {preview.page != null && (
            <span className="text-muted-foreground ml-auto font-mono text-[10px]">
              p.{preview.page}
            </span>
          )}
        </div>
        <p className="border-highlight-border bg-highlight/60 text-highlight-foreground line-clamp-4 border-l-2 px-2.5 py-2 text-xs leading-relaxed">
          {preview.quote}
        </p>
        <div className="flex items-center justify-between gap-2">
          {preview.verdict ? (
            <span className="flex items-center gap-2">
              <VerdictBadge verdict={preview.verdict} />
              {preview.confidence != null && (
                <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                  {preview.confidence.toFixed(2)}
                </span>
              )}
            </span>
          ) : (
            <span />
          )}
          {onActivate && (
            <button
              type="button"
              onClick={onActivate}
              className="text-primary inline-flex items-center gap-1 text-xs font-semibold"
            >
              Open source
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
