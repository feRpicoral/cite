import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuditSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="gap-0 p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="mt-4 grid grid-cols-3 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-[10px]" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 min-w-48 flex-1" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-44" />
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 not-last:border-b">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
        ))}
      </Card>
    </div>
  );
}
