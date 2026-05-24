"use client";

import { Check, MessageCircle, MoreHorizontal, Send, Trash2 } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CommentReply {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

interface Comment {
  id: string;
  targetType: "MESSAGE" | "DOCUMENT_REGION";
  targetId: string;
  authorUserId: string;
  body: string;
  resolvedAt: string | null;
  createdAt: string;
  replies: CommentReply[];
}

interface State {
  comments: Comment[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "loadingStart" }
  | { type: "loaded"; comments: Comment[] }
  | { type: "error"; message: string }
  | { type: "addComment"; comment: Comment }
  | { type: "addReply"; commentId: string; reply: CommentReply }
  | { type: "setResolved"; commentId: string; resolved: boolean }
  | { type: "removeComment"; commentId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loadingStart":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { comments: action.comments, loading: false, error: null };
    case "error":
      return { ...state, loading: false, error: action.message };
    case "addComment":
      return { ...state, comments: [...state.comments, action.comment] };
    case "addReply":
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.commentId ? { ...c, replies: [...c.replies, action.reply] } : c,
        ),
      };
    case "setResolved":
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.commentId
            ? { ...c, resolvedAt: action.resolved ? new Date().toISOString() : null }
            : c,
        ),
      };
    case "removeComment":
      return { ...state, comments: state.comments.filter((c) => c.id !== action.commentId) };
  }
}

interface CommentThreadProps {
  targetType: "MESSAGE" | "DOCUMENT_REGION";
  targetId: string;
  currentUserId: string;
}

export function CommentThread({ targetType, targetId, currentUserId }: CommentThreadProps) {
  const [state, dispatch] = useReducer(reducer, { comments: [], loading: true, error: null });
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      dispatch({ type: "loadingStart" });
      try {
        const res = await fetch(`/api/comments?targetType=${targetType}&targetId=${targetId}`);
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = (await res.json()) as { comments: Comment[] };
        if (!cancelled) dispatch({ type: "loaded", comments: data.comments });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: "error",
            message: err instanceof Error ? err.message : "Failed",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, body }),
    });
    if (!res.ok) {
      toast.error("Failed to post comment");
      return;
    }
    const { id } = (await res.json()) as { id: string };
    dispatch({
      type: "addComment",
      comment: {
        id,
        targetType,
        targetId,
        authorUserId: currentUserId,
        body,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        replies: [],
      },
    });
    setDraft("");
  };

  const resolve = async (commentId: string, resolved: boolean) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    dispatch({ type: "setResolved", commentId, resolved });
  };

  const remove = async (commentId: string) => {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    dispatch({ type: "removeComment", commentId });
  };

  return (
    <div className="space-y-3 text-sm">
      {state.loading && <p className="text-muted-foreground text-xs">Loading…</p>}
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
      {state.comments.length === 0 && !state.loading && (
        <p className="text-muted-foreground text-xs">No comments yet.</p>
      )}
      {state.comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          currentUserId={currentUserId}
          onResolveToggle={(resolved) => void resolve(c.id, resolved)}
          onDelete={() => void remove(c.id)}
          onReply={(reply) => dispatch({ type: "addReply", commentId: c.id, reply })}
        />
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="border-input bg-background flex items-end gap-2 rounded-lg border p-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="Add a comment…"
          className="placeholder:text-muted-foreground max-h-24 min-h-[24px] w-full resize-none border-0 bg-transparent px-1 py-1 text-xs outline-none"
        />
        <Button type="submit" size="icon-xs" disabled={draft.trim().length === 0}>
          <Send className="h-3 w-3" />
        </Button>
      </form>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  onResolveToggle: (resolved: boolean) => void;
  onDelete: () => void;
  onReply: (reply: CommentReply) => void;
}

function CommentItem({
  comment,
  currentUserId,
  onResolveToggle,
  onDelete,
  onReply,
}: CommentItemProps) {
  const [draft, setDraft] = useState("");
  const isOwn = comment.authorUserId === currentUserId;
  const resolved = comment.resolvedAt != null;

  const submitReply = async () => {
    const body = draft.trim();
    if (!body) return;
    const res = await fetch(`/api/comments/${comment.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      toast.error("Failed to reply");
      return;
    }
    const { id } = (await res.json()) as { id: string };
    onReply({
      id,
      authorUserId: currentUserId,
      body,
      createdAt: new Date().toISOString(),
    });
    setDraft("");
  };

  return (
    <div className={cn("rounded-md border p-2", resolved && "opacity-60")}>
      <div className="flex items-start gap-2">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[9px]">{shortId(comment.authorUserId)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] font-medium">{shortId(comment.authorUserId)}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Comment menu">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onResolveToggle(!resolved)}>
                  <Check className="h-3 w-3" />
                  {resolved ? "Reopen" : "Resolve"}
                </DropdownMenuItem>
                {isOwn && (
                  <DropdownMenuItem onSelect={onDelete} className="text-destructive">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs whitespace-pre-wrap">{comment.body}</p>
          {comment.replies.length > 0 && (
            <ul className="mt-2 space-y-1 border-l pl-2">
              {comment.replies.map((r) => (
                <li key={r.id} className="text-muted-foreground text-xs">
                  <span className="text-foreground font-medium">{shortId(r.authorUserId)}: </span>
                  {r.body}
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitReply();
            }}
            className="mt-2 flex items-center gap-1"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply…"
              className="placeholder:text-muted-foreground flex-1 border-0 bg-transparent px-1 text-[11px] outline-none"
            />
            <Button type="submit" size="icon-xs" disabled={draft.trim().length === 0}>
              <MessageCircle className="h-3 w-3" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function shortId(uuid: string): string {
  return uuid.slice(0, 6);
}
