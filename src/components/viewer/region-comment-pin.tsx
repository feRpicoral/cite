"use client";

import { Check, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { CommentThread } from "@/components/comments/comment-thread";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RegionCommentPinProps {
  documentId: string;
  commentId: string;
  resolved: boolean;
  currentUserId: string;
  onChange: () => void;
  style?: React.CSSProperties;
  side?: "left" | "right" | "bottom";
}

export function RegionCommentPin({
  documentId,
  commentId,
  resolved,
  currentUserId,
  onChange,
  style,
  side = "left",
}: RegionCommentPinProps) {
  const t = useTranslations("documentViewer");
  return (
    <Popover onOpenChange={(open) => !open && onChange()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("viewComment")}
          style={style}
          className={cn(
            "absolute flex size-5 items-center justify-center rounded-[50%_50%_50%_2px] shadow-sm transition-transform hover:scale-110",
            resolved
              ? "bg-card ring-success/70 text-success ring-[1.5px]"
              : "bg-highlight-border text-white",
          )}
        >
          {resolved ? (
            <Check className="size-2.5" strokeWidth={3} />
          ) : (
            <MessageSquare className="size-2.5" strokeWidth={2.4} />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-80 p-3">
        <CommentThread
          targetType="DOCUMENT_REGION"
          targetId={documentId}
          currentUserId={currentUserId}
          focusCommentId={commentId}
        />
      </PopoverContent>
    </Popover>
  );
}
