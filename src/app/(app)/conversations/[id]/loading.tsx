import { Loader2 } from "lucide-react";

/**
 * Conversations have their own split-pane layout; while the chat panel
 * and viewer load, render the same spinner inside the split-pane chrome
 * so the user doesn't see the parent (app) loading bleed through.
 */
export default function ConversationLoading() {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading conversation…
    </div>
  );
}
