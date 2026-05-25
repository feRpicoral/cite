import { Loader2 } from "lucide-react";

/**
 * Default loading UI for every (app) route. Next.js renders this segment
 * while the matching `page.tsx` server component awaits its data, so the
 * shell stays mounted (sidebar visible) and the main panel shows a
 * spinner instead of looking frozen.
 */
export default function AppLoading() {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}
