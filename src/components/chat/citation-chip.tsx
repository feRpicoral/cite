"use client";

import type { InitialCitation } from "@/app/(app)/conversations/[id]/chat-panel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CitationChipProps {
  displayIndex: number;
  citation?: InitialCitation;
}

export function CitationChip({ displayIndex, citation }: CitationChipProps) {
  const chip = (
    <button
      type="button"
      className="bg-highlight/30 text-highlight-foreground hover:bg-highlight/50 mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 align-baseline text-[10px] leading-none font-semibold transition-colors"
      aria-label={`Open citation ${displayIndex}`}
    >
      {displayIndex}
    </button>
  );

  if (!citation) return chip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <p className="text-xs font-semibold">{citation.documentName}</p>
        <p className="mt-1 line-clamp-4 text-xs">{citation.quote}</p>
      </TooltipContent>
    </Tooltip>
  );
}
