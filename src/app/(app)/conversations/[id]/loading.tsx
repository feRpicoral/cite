import { Loader2 } from "lucide-react";

export default function ConversationLoading() {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading conversation…
    </div>
  );
}
