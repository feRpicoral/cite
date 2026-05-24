import { cn } from "@/lib/utils";

export function MessageBubble({
  role,
  children,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
          role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-foreground border",
        )}
      >
        {children}
      </div>
    </div>
  );
}
