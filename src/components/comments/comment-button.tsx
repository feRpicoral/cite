"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CommentThread } from "@/components/comments/comment-thread";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CommentButtonProps {
  targetType: "MESSAGE" | "DOCUMENT_REGION";
  targetId: string;
  currentUserId: string;
}

export function CommentButton({ targetType, targetId, currentUserId }: CommentButtonProps) {
  const t = useTranslations("conversation.comments");
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const hasComments = (count ?? 0) > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md text-[11px] font-semibold transition-colors",
            hasComments
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100",
          )}
        >
          <MessageSquare className="size-3.5" strokeWidth={2} />
          {hasComments ? t("indicator", { count: count ?? 0 }) : t("title")}
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-80 p-0">
        <CommentThread
          targetType={targetType}
          targetId={targetId}
          currentUserId={currentUserId}
          onCountChange={setCount}
        />
      </PopoverContent>
    </Popover>
  );
}
