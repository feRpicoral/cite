import { cn } from "@/lib/utils";

export function MessageBubble({
  role,
  className,
  children,
}: {
  role: "user" | "assistant";
  className?: string;
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "bg-primary text-primary-foreground max-w-[85%] rounded-[14px] rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed",
            className,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-[14px] rounded-bl-sm border px-4 py-3.5 text-sm shadow-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}
