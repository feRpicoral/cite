import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[60%]"
        aria-hidden="true"
      >
        <path d="M9 5 H6 V19 H9" />
        <path d="M15 5 H18 V19 H15" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
