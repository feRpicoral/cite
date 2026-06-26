import { cn } from "@/lib/utils";

export function SystemScreen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-background flex min-h-svh flex-col items-center justify-center px-6 py-12",
        className,
      )}
    >
      {children}
    </div>
  );
}
