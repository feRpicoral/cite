"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DocumentViewer } from "@/components/viewer/document-viewer";
import { useViewer } from "@/components/viewer/viewer-state";

export function ViewerSheet({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations("conversation.viewer");
  const { target, close } = useViewer();

  return (
    <Sheet open={target != null} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-none">
        <SheetTitle className="sr-only">{target?.documentName ?? ""}</SheetTitle>
        <button
          type="button"
          onClick={close}
          className="text-primary flex h-10 shrink-0 items-center gap-1 border-b px-2 text-xs font-semibold"
        >
          <ChevronLeft className="size-4" strokeWidth={2.2} />
          {t("backToChat")}
        </button>
        <div className="min-h-0 flex-1">
          <DocumentViewer currentUserId={currentUserId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
