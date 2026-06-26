"use client";

import { MessageSquarePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface NewRegionCommentPopoverProps {
  anchor: React.CSSProperties;
  side?: "bottom" | "right";
  onSubmit: (body: string) => void;
  onCancel: () => void;
}

export function NewRegionCommentPopover({
  anchor,
  side = "bottom",
  onSubmit,
  onCancel,
}: NewRegionCommentPopoverProps) {
  const t = useTranslations("documentViewer");
  const [draft, setDraft] = useState("");

  return (
    <Popover open onOpenChange={(o) => !o && onCancel()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("newRegionComment")}
          className="bg-primary text-primary-foreground absolute z-10 rounded-full p-1 shadow"
          style={{ position: "absolute", ...anchor }}
        >
          <MessageSquarePlus className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-72 space-y-2.5 p-3">
        <p className="text-foreground text-xs font-semibold">{t("commentOnSelection")}</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={t("commentPlaceholder")}
          autoFocus
          className="border-input bg-muted/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 w-full resize-none rounded-md border px-2.5 py-2 text-xs outline-none focus-visible:ring-[3px]"
        />
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            disabled={draft.trim().length === 0}
            onClick={() => onSubmit(draft.trim())}
          >
            {t("comment")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
