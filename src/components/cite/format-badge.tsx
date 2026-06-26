import type { DocumentFormat } from "@prisma/client";

import { cn } from "@/lib/utils";

const FORMAT_CLASS: Record<DocumentFormat, string> = {
  PDF: "bg-destructive/10 text-destructive",
  DOCX: "bg-primary/10 text-primary",
  HTML: "bg-warning/15 text-warning",
  MD: "bg-success/12 text-success",
};

export function FormatBadge({ format, className }: { format: DocumentFormat; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 font-mono text-[10px] font-semibold tracking-wide",
        FORMAT_CLASS[format],
        className,
      )}
    >
      {format}
    </span>
  );
}
