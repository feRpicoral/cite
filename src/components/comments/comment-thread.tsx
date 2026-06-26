"use client";

import { Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Author {
  name: string | null;
  email: string;
}

interface CommentReply {
  id: string;
  authorUserId: string;
  author?: Author | null;
  body: string;
  createdAt: string;
}

interface Comment {
  id: string;
  targetType: "MESSAGE" | "DOCUMENT_REGION";
  targetId: string;
  authorUserId: string;
  author?: Author | null;
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
  /**
   * Restricts the thread to this single comment so a region pin shows only its
   * own thread, not every region comment on the document. Also hides the "add
   * comment" form, since new region comments come from a text selection.
   */
  focusCommentId?: string;
  onCountChange?: (count: number) => void;
}

export function CommentThread({
  targetType,
  targetId,
  currentUserId,
  focusCommentId,
  onCountChange,
}: CommentThreadProps) {
  const t = useTranslations("conversation.comments");
  const [state, dispatch] = useReducer(reducer, { comments: [], loading: true, error: null });
  const [draft, setDraft] = useState("");

  const visible = state.comments.filter((c) => (focusCommentId ? c.id === focusCommentId : true));
  const firstResolved = visible.find((c) => c.resolvedAt != null) ?? null;

  useEffect(() => {
    if (!state.loading) onCountChange?.(visible.length);
  }, [state.loading, visible.length, onCountChange]);

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
      toast.error(t("addFailed"));
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
      toast.error(t("updateFailed"));
      return;
    }
    dispatch({ type: "setResolved", commentId, resolved });
  };

  const remove = async (commentId: string) => {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("deleteFailed"));
      return;
    }
    dispatch({ type: "removeComment", commentId });
  };

  return (
    <div className="text-sm">
      <div className="flex h-10 items-center gap-2 border-b px-3.5">
        <span className="text-foreground text-[13px] font-semibold">{t("title")}</span>
        {visible.length > 0 && (
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold">
            {visible.length}
          </span>
        )}
        {firstResolved == null && visible.length > 0 && (
          <button
            type="button"
            onClick={() => void resolve(visible[0]!.id, true)}
            className="text-success ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold"
          >
            <Check className="size-3" strokeWidth={2.6} />
            {t("resolve")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3.5 px-3.5 py-3">
        {state.loading && <ThreadSkeleton />}
        {state.error && <p className="text-destructive text-xs">{state.error}</p>}
        {!state.loading && visible.length === 0 && (
          <div className="py-2 text-center">
            <p className="text-foreground text-[13px] font-semibold">{t("empty")}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t("emptyHint")}</p>
          </div>
        )}
        {visible.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            currentUserId={currentUserId}
            onResolveToggle={(resolved) => void resolve(c.id, resolved)}
            onDelete={() => void remove(c.id)}
            onReply={(reply) => dispatch({ type: "addReply", commentId: c.id, reply })}
          />
        ))}
      </div>

      {!focusCommentId && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="bg-muted/40 flex items-center gap-2 border-t px-3 py-2.5"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("addPlaceholder")}
            className="bg-card focus:border-ring placeholder:text-muted-foreground h-8 flex-1 rounded-lg border px-2.5 text-xs outline-none"
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={draft.trim().length === 0}
            aria-label={t("reply")}
          >
            <Send />
          </Button>
        </form>
      )}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-muted animate-cite-pulse size-6 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="bg-muted animate-cite-pulse h-2 w-1/2 rounded" />
        <div className="bg-muted animate-cite-pulse h-2 w-4/5 rounded" />
      </div>
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
  const t = useTranslations("conversation.comments");
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);
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
      toast.error(t("replyFailed"));
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
    setReplying(false);
  };

  return (
    <div className={cn(resolved && "opacity-70")}>
      <CommentRow
        authorUserId={comment.authorUserId}
        author={comment.author}
        isOwn={isOwn}
        createdAt={comment.createdAt}
      >
        {resolved ? (
          <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed line-through">
            {comment.body}
          </p>
        ) : (
          <p className="text-foreground mt-1 text-[13px] leading-relaxed whitespace-pre-wrap">
            {comment.body}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setReplying((v) => !v)}
            className="text-muted-foreground hover:text-foreground text-[10.5px] font-semibold"
          >
            {t("reply")}
          </button>
          <button
            type="button"
            onClick={() => onResolveToggle(!resolved)}
            className="text-muted-foreground hover:text-foreground text-[10.5px] font-semibold"
          >
            {resolved ? t("reopen") : t("resolve")}
          </button>
          {isOwn && (
            <button
              type="button"
              onClick={onDelete}
              className="text-destructive text-[10.5px] font-semibold"
            >
              {t("delete")}
            </button>
          )}
        </div>
      </CommentRow>

      {comment.replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 pl-[34px]">
          {comment.replies.map((r) => (
            <CommentRow
              key={r.id}
              authorUserId={r.authorUserId}
              author={r.author}
              isOwn={r.authorUserId === currentUserId}
              createdAt={r.createdAt}
            >
              <p className="text-foreground mt-1 text-[13px] leading-relaxed whitespace-pre-wrap">
                {r.body}
              </p>
            </CommentRow>
          ))}
        </div>
      )}

      {replying && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitReply();
          }}
          className="mt-2 flex items-center gap-2 pl-[34px]"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            placeholder={t("replyPlaceholder")}
            className="bg-card focus:border-ring placeholder:text-muted-foreground h-8 flex-1 rounded-lg border px-2.5 text-xs outline-none"
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={draft.trim().length === 0}
            aria-label={t("reply")}
          >
            <Send />
          </Button>
        </form>
      )}
    </div>
  );
}

function CommentRow({
  authorUserId,
  author,
  isOwn,
  createdAt,
  children,
}: {
  authorUserId: string;
  author?: Author | null;
  isOwn: boolean;
  createdAt: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("conversation.comments");
  const name = displayName(author, isOwn, authorUserId, t("you"));
  return (
    <div className="flex gap-2.5">
      <Avatar className="size-6 shrink-0">
        <AvatarFallback className="text-[9px] font-semibold">{initialsOf(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground truncate text-[12.5px] font-semibold">{name}</span>
          {isOwn && (
            <span className="bg-primary/12 text-primary rounded px-1.5 py-0.5 text-[9px] font-semibold">
              {t("you")}
            </span>
          )}
          <span className="text-muted-foreground ml-auto font-mono text-[10px]">
            {relativeTime(createdAt)}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function displayName(
  author: Author | null | undefined,
  isOwn: boolean,
  authorUserId: string,
  youLabel: string,
): string {
  if (author?.name) return author.name;
  const local = author?.email?.split("@")[0];
  if (local) return local;
  if (isOwn) return youLabel;
  return authorUserId.slice(0, 6);
}

function initialsOf(name: string): string {
  return (
    name
      .split(/[\s.@_-]+/)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "?"
  );
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE_MS) return "now";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h`;
  return `${Math.floor(diff / DAY_MS)}d`;
}
