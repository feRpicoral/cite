"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";

import { CommentThread } from "@/components/comments/comment-thread";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CommentButtonProps {
  targetType: "MESSAGE" | "DOCUMENT_REGION";
  targetId: string;
  currentUserId: string;
}

export function CommentButton({ targetType, targetId, currentUserId }: CommentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Comments"
          className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MessageSquare className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-80 p-3">
        <CommentThread targetType={targetType} targetId={targetId} currentUserId={currentUserId} />
      </PopoverContent>
    </Popover>
  );
}
