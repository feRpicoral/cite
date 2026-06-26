import { cn } from "@/lib/utils";

export function CiteMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden
    >
      <path d="M9 5 H6 V19 H9 M15 5 H18 V19 H15" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CiteLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
        <CiteMark />
      </span>
      <span className="text-lg leading-none font-semibold tracking-tight">Cite</span>
    </span>
  );
}
