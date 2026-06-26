"use client";

import { CloudOff, Download, FileText, FileX2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/cite/empty-state";
import { Button } from "@/components/ui/button";

export function ViewerLoading() {
  const t = useTranslations("documentViewer");
  return (
    <div className="bg-muted/30 flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 justify-center overflow-hidden p-4">
        <div className="bg-card flex w-full max-w-[400px] flex-col gap-3 rounded-sm p-6 shadow-sm">
          <div className="bg-muted animate-cite-pulse h-3 w-1/2 rounded-full" />
          <div className="bg-muted/80 animate-cite-pulse h-2.5 w-full rounded-full [animation-delay:0.1s]" />
          <div className="bg-muted/80 animate-cite-pulse h-2.5 w-[92%] rounded-full [animation-delay:0.2s]" />
          <div className="bg-muted/80 animate-cite-pulse h-2.5 w-[96%] rounded-full [animation-delay:0.3s]" />
          <div className="bg-muted/80 animate-cite-pulse h-2.5 w-3/5 rounded-full [animation-delay:0.4s]" />
          <div className="bg-muted/80 animate-cite-pulse mt-2 h-2.5 w-[88%] rounded-full [animation-delay:0.5s]" />
          <div className="bg-muted/80 animate-cite-pulse h-2.5 w-full rounded-full [animation-delay:0.6s]" />
        </div>
      </div>
      <div className="text-muted-foreground flex h-10 shrink-0 items-center justify-center gap-2 border-t text-[11px] font-medium">
        <span className="text-primary animate-cite-spin size-3 rounded-full border-2 border-current border-t-transparent" />
        {t("loading")}
      </div>
    </div>
  );
}

export function ViewerFailed({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("documentViewer");
  return (
    <div className="flex flex-1 items-center justify-center p-7">
      <EmptyState
        tone="muted"
        icon={<CloudOff className="text-destructive" />}
        title={t("failedTitle")}
        description={t("failedDescription")}
      >
        <Button onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          {t("retry")}
        </Button>
      </EmptyState>
    </div>
  );
}

export function ViewerNotFound({ onBack }: { onBack: () => void }) {
  const t = useTranslations("documentViewer");
  return (
    <div className="flex flex-1 items-center justify-center p-7">
      <EmptyState
        tone="muted"
        icon={<FileX2 />}
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
      >
        <Button variant="outline" onClick={onBack}>
          {t("backToChatAction")}
        </Button>
      </EmptyState>
    </div>
  );
}

export function ViewerUnsupported({ downloadUrl }: { downloadUrl: string }) {
  const t = useTranslations("documentViewer");
  return (
    <div className="flex flex-1 items-center justify-center p-7">
      <EmptyState
        tone="muted"
        icon={<FileText />}
        title={t("unsupportedTitle")}
        description={t("unsupportedDescription")}
      >
        <Button variant="outline" asChild>
          <a href={downloadUrl} download>
            <Download className="size-3.5" />
            {t("download")}
          </a>
        </Button>
      </EmptyState>
    </div>
  );
}
