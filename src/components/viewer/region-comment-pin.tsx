"use client";

import { MessageSquare } from "lucide-react";

import { CommentThread } from "@/components/comments/comment-thread";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RegionCommentPinProps {
  documentId: string;
  commentId: string;
  resolved: boolean;
  top: number;
  currentUserId: string;
  onChange: () => void;
}

export function RegionCommentPin({
  documentId,
  commentId,
  resolved,
  top,
  currentUserId,
  onChange,
}: RegionCommentPinProps) {
  return (
    <Popover onOpenChange={(open) => !open && onChange()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View comment"
          style={{ top }}
          className={cn(
            "absolute right-2 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors",
            resolved
              ? "bg-muted text-muted-foreground border-muted-foreground/20"
              : "bg-card border-border hover:bg-muted",
          )}
        >
          <MessageSquare className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-80 p-3">
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
