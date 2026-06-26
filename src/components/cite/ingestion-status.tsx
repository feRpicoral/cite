import type { DocumentStatus } from "@prisma/client";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const IN_PROGRESS: Partial<Record<DocumentStatus, { label: string; dot: string }>> = {
  UPLOADING: { label: "Uploading", dot: "bg-primary" },
  EXTRACTING: { label: "Extracting", dot: "bg-primary" },
  CHUNKING: { label: "Chunking", dot: "bg-warning" },
  EMBEDDING: { label: "Embedding", dot: "bg-warning" },
};

export function IngestionStatus({
  status,
  errorMessage,
  className,
}: {
  status: DocumentStatus;
  errorMessage?: string | null;
  className?: string;
}) {
  if (status === "INDEXED") {
    return (
      <span
        className={cn("text-muted-foreground inline-flex items-center gap-2 text-xs", className)}
      >
        <span className="bg-success size-1.5 rounded-full" />
        Indexed
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span
        className={cn(
          "text-destructive inline-flex items-center gap-1.5 text-xs font-medium",
          className,
        )}
        title={errorMessage ?? undefined}
      >
        <X className="size-3.5" strokeWidth={2.5} />
        Failed
      </span>
    );
  }

  const entry = IN_PROGRESS[status] ?? { label: "Processing", dot: "bg-primary" };
  return (
    <span
      className={cn("text-warning inline-flex items-center gap-2 text-xs font-medium", className)}
    >
      <span className={cn("animate-cite-pulse size-1.5 rounded-full", entry.dot)} />
      {entry.label}…
    </span>
  );
}
