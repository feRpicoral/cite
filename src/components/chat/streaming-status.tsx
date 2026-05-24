"use client";

import { Loader2, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

type Status = "submitted" | "streaming" | "ready" | "error";

const LABEL: Partial<Record<Status, string>> = {
  submitted: "Searching documents…",
  streaming: "Synthesizing answer…",
};

export function StreamingStatus({ status, onStop }: { status: Status; onStop: () => void }) {
  const label = LABEL[status];
  if (!label) return null;
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{label}</span>
      <Button variant="ghost" size="icon-xs" onClick={onStop} aria-label="Stop">
        <Square className="h-3 w-3" />
      </Button>
    </div>
  );
}
