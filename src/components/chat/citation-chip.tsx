"use client";

import type { InitialCitation } from "@/app/(app)/conversations/[id]/chat-panel";
import { CitationChip as CitationChipPrimitive } from "@/components/cite/citation-chip";
import { useViewer } from "@/components/viewer/viewer-state";

interface CitationChipProps {
  displayIndex: number;
  citation?: InitialCitation;
  pending?: boolean;
}

export function CitationChip({ displayIndex, citation, pending }: CitationChipProps) {
  const { open, target } = useViewer();

  if (pending || !citation) {
    return <CitationChipPrimitive index={displayIndex} state="pending" />;
  }

  const isOpen =
    target?.documentId === citation.documentId && target?.displayIndex === citation.displayIndex;

  const activate = () =>
    open({
      documentId: citation.documentId,
      documentName: citation.documentName,
      format: citation.format ?? undefined,
      location: citation.location,
      displayIndex: citation.displayIndex,
      quote: citation.quote,
      verdict: citation.verdict ?? undefined,
      confidence: citation.confidence ?? undefined,
    });

  const page = citation.location.kind === "pdf" ? citation.location.page + 1 : null;

  return (
    <CitationChipPrimitive
      index={displayIndex}
      state={isOpen ? "open" : "default"}
      onActivate={activate}
      preview={{
        documentName: citation.documentName,
        format: citation.format ?? undefined,
        page,
        quote: citation.quote,
        verdict: citation.verdict ?? undefined,
        confidence: citation.confidence ?? undefined,
      }}
    />
  );
}
