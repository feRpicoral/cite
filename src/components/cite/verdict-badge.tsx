import type { CitationVerdict } from "@prisma/client";
import { Check, type LucideIcon, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "destructive";

const VERDICT: Record<CitationVerdict, { label: string; variant: Variant; Icon: LucideIcon }> = {
  SUPPORTED: { label: "Supported", variant: "success", Icon: Check },
  PARTIAL: { label: "Partial", variant: "warning", Icon: TriangleAlert },
  UNSUPPORTED: { label: "Unsupported", variant: "destructive", Icon: X },
};

const BAR_BG: Record<Variant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: CitationVerdict;
  className?: string;
}) {
  const { label, variant, Icon } = VERDICT[verdict];
  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className="size-3" strokeWidth={2.75} />
      {label}
    </Badge>
  );
}

export function ConfidenceBar({
  value,
  verdict,
  className,
}: {
  value: number;
  verdict: CitationVerdict;
  className?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full", BAR_BG[VERDICT[verdict].variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground w-8 font-mono text-[11px] tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  );
}
