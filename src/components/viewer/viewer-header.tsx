"use client";

import type { DocumentFormat } from "@prisma/client";
import { ChevronLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { FormatBadge } from "@/components/cite/format-badge";
import { Button } from "@/components/ui/button";

interface ViewerHeaderProps {
  format?: DocumentFormat;
  name?: string;
  isMobile: boolean;
  onClose: () => void;
}

export function ViewerHeader({ format, name, isMobile, onClose }: ViewerHeaderProps) {
  const t = useTranslations("documentViewer");

  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b px-3.5">
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-primary -ml-1 gap-1 px-1.5"
        >
          <ChevronLeft className="size-4" />
          {t("backToChat")}
        </Button>
      )}
      {format && <FormatBadge format={format} />}
      {name ? (
        <span className="text-foreground min-w-0 flex-1 truncate text-[13px] font-semibold">
          {name}
        </span>
      ) : (
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px] font-semibold">
          {t("sourceFallbackTitle")}
        </span>
      )}
      {!isMobile && (
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("close")}>
          <X className="size-4" />
        </Button>
      )}
    </header>
  );
}

export function ViewerHeaderSkeleton({
  isMobile,
  onClose,
}: {
  isMobile: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("documentViewer");
  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b px-3.5">
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-primary -ml-1 gap-1 px-1.5"
        >
          <ChevronLeft className="size-4" />
          {t("backToChat")}
        </Button>
      )}
      <div className="bg-muted animate-cite-pulse h-2.5 w-40 max-w-[60%] rounded-full" />
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={t("close")}
          className="ml-auto"
        >
          <X className="size-4" />
        </Button>
      )}
    </header>
  );
}
