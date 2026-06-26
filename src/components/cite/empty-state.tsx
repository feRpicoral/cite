import { cn } from "@/lib/utils";

const TONE: Record<"muted" | "primary" | "warning", string> = {
  muted: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning",
};

export function EmptyState({
  icon,
  title,
  description,
  tone = "muted",
  className,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  tone?: "muted" | "primary" | "warning";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex size-12 items-center justify-center rounded-xl [&_svg]:size-6",
            TONE[tone],
          )}
        >
          {icon}
        </div>
      )}
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {description && (
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{description}</p>
      )}
      {children && <div className="mt-5 flex items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
