"use client";

import { useChat } from "@ai-sdk/react";
import type { CitationVerdict, DocumentFormat } from "@prisma/client";
import { DefaultChatTransport } from "ai";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AskAnything } from "@/components/chat/ask-anything";
import { ChatComposer } from "@/components/chat/chat-composer";
import { CitationChip } from "@/components/chat/citation-chip";
import { MessageBubble } from "@/components/chat/message-bubble";
import { NoAnswer } from "@/components/chat/no-answer";
import { type ReasoningSummary, summarizeReasoning } from "@/components/chat/reasoning";
import { ReasoningTrace } from "@/components/chat/reasoning-trace";
import { StreamingStatus } from "@/components/chat/streaming-status";
import { SupportFooter } from "@/components/chat/support-footer";
import { CommentButton } from "@/components/comments/comment-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type DocumentLocation, DocumentLocationSchema } from "@/lib/ingestion/location";
import { type MessageInsertPayload, useMessageInserts } from "@/lib/realtime/message-sync";
import { findReconcilableMessageIndex } from "@/lib/realtime/reconcile";

export interface InitialCitation {
  displayIndex: number;
  quote: string;
  chunkId: string;
  documentId: string;
  documentName: string;
  format?: DocumentFormat | null;
  location: DocumentLocation;
  verdict?: CitationVerdict | null;
  confidence?: number | null;
}

export interface InitialMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: InitialCitation[];
  agentState?: unknown;
}

interface ChatPanelProps {
  conversationId: string;
  initialMessages: InitialMessage[];
  collectionName: string;
  currentUserId: string;
}

const PERSISTED_ID = /^[0-9a-f-]{36}$/;
const CITATION_MARKER = /\[(\d+(?:\s*,\s*\d+)*)\]/;

export function ChatPanel({
  conversationId,
  initialMessages,
  collectionName,
  currentUserId,
}: ChatPanelProps) {
  const t = useTranslations("conversation");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }),
    [conversationId],
  );

  const { messages, sendMessage, status, stop, setMessages, error, regenerate, clearError } =
    useChat({
      transport,
      messages: initialMessages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
      })),
    });

  const reasoningById = useMemo(() => {
    const map = new Map<string, ReasoningSummary>();
    for (const m of initialMessages) {
      if (m.agentState == null) continue;
      const summary = summarizeReasoning(m.agentState);
      if (summary) map.set(m.id, summary);
    }
    return map;
  }, [initialMessages]);

  // Citation hydration: initial messages from the server come with their
  // citations attached. Fresh streamed assistant messages render `[n]`
  // chips in the text but the citation rows are only written by the chat
  // route's onFinish, so we refetch them once the persisted UUID is known.
  const [citationsByMessage, setCitationsByMessage] = useState<Map<string, InitialCitation[]>>(
    () => {
      const map = new Map<string, InitialCitation[]>();
      for (const m of initialMessages) map.set(m.id, m.citations);
      return map;
    },
  );
  // Track messages we've already attempted to fetch citations for so the
  // effect doesn't loop on an empty-citation response.
  const fetchedCitationsRef = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));

  // Live message sync: when a teammate sends a message, or when our own
  // streamed assistant message persists, postgres_changes fires an INSERT
  // we splice into useChat's state. The stream-generated id differs from
  // the persisted UUID, so we rewrite the id of a still-optimistic local
  // message that matches by role+content; an already-persisted bubble keeps
  // its UUID. See findReconcilableMessageIndex for the matching rules.
  const onIncoming = useCallback(
    (payload: MessageInsertPayload) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        const incomingText = payload.content;
        const role: "user" | "assistant" = payload.role === "ASSISTANT" ? "assistant" : "user";
        const matchIndex = findReconcilableMessageIndex(prev, { role, content: incomingText });
        if (matchIndex !== -1) {
          const next = prev.slice();
          next[matchIndex] = { ...next[matchIndex]!, id: payload.id };
          return next;
        }
        return [
          ...prev,
          {
            id: payload.id,
            role,
            parts: [{ type: "text" as const, text: incomingText }],
          },
        ];
      });
    },
    [setMessages],
  );
  useMessageInserts(conversationId, onIncoming);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, status]);

  // Hydrate citations for any persisted assistant message we haven't fetched
  // yet. Triggers right after onIncoming rewrites a streamed id to the
  // persisted UUID, so the chips in the just-finished response become
  // clickable without a refresh.
  useEffect(() => {
    let cancelled = false;
    const targets = messages.filter(
      (m) =>
        m.role === "assistant" && PERSISTED_ID.test(m.id) && !fetchedCitationsRef.current.has(m.id),
    );
    if (targets.length === 0) return;
    for (const m of targets) fetchedCitationsRef.current.add(m.id);

    void (async () => {
      const results = await Promise.all(
        targets.map(async (m) => {
          try {
            const res = await fetch(`/api/messages/${m.id}/citations`);
            if (!res.ok) return null;
            const data = (await res.json()) as { citations: RawCitation[] };
            return [m.id, parseCitations(data.citations)] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const fetched = results.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (fetched.length === 0) return;
      setCitationsByMessage((prev) => {
        const next = new Map(prev);
        for (const [id, citations] of fetched) next.set(id, citations);
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [messages]);

  const lastMessage = messages.at(-1);
  const failedUserId = error && lastMessage?.role === "user" ? lastMessage.id : undefined;

  const busy = status === "streaming" || status === "submitted";

  const retry = () => {
    clearError();
    void regenerate();
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-6 sm:px-6">
          {messages.length === 0 ? (
            <AskAnything
              collectionName={collectionName}
              onPickSuggestion={(text) => sendMessage({ text })}
            />
          ) : (
            messages.map((m) => {
              const text = m.parts
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("");
              const isPersisted = PERSISTED_ID.test(m.id);

              if (m.role === "user") {
                return (
                  <UserMessage
                    key={m.id}
                    text={text}
                    failed={m.id === failedUserId}
                    onRetry={retry}
                  />
                );
              }

              const citations = citationsByMessage.get(m.id) ?? [];
              const hasMarkers = CITATION_MARKER.test(text);
              const hydrating = isPersisted && hasMarkers && !citationsByMessage.has(m.id);
              const reasoning = reasoningById.get(m.id);
              const noAnswer = isPersisted && text.length > 0 && !hasMarkers;
              const streaming = status === "streaming" && m.id === lastMessage?.id && !isPersisted;

              return (
                <AssistantMessage
                  key={m.id}
                  messageId={m.id}
                  text={text}
                  citations={citations}
                  linking={hydrating}
                  reasoning={reasoning}
                  noAnswer={noAnswer}
                  isPersisted={isPersisted}
                  streaming={streaming}
                  currentUserId={currentUserId}
                />
              );
            })
          )}
          {status === "submitted" && (
            <div className="flex items-center gap-2">
              <CiteLabel />
              <StreamingStatus status={status} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-t px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto max-w-2xl">
          <ChatComposer
            onSend={(content) => sendMessage({ text: content })}
            busy={busy}
            onStop={stop}
            placeholder={t(
              messages.length === 0 ? "composer.placeholderNew" : "composer.placeholder",
              { collection: collectionName },
            )}
          />
        </div>
      </div>
    </div>
  );
}

function CiteLabel() {
  const t = useTranslations("conversation");
  return (
    <div className="flex items-center gap-2">
      <div className="bg-foreground text-background flex size-[22px] items-center justify-center rounded-md font-mono text-[11px] font-semibold">
        C
      </div>
      <span className="text-foreground/80 text-xs font-semibold">{t("cite")}</span>
    </div>
  );
}

function UserMessage({
  text,
  failed,
  onRetry,
}: {
  text: string;
  failed: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("conversation.composer");
  return (
    <div className="flex flex-col items-end gap-1">
      <MessageBubble role="user" className={failed ? "opacity-60" : undefined}>
        <p className="whitespace-pre-wrap">{text}</p>
      </MessageBubble>
      {failed && (
        <div className="flex items-center gap-1.5 pr-1">
          <CircleAlert className="text-destructive size-3" strokeWidth={2.2} />
          <span className="text-destructive text-[10.5px] font-medium">{t("deliveryFailed")}</span>
          <button
            type="button"
            onClick={onRetry}
            className="text-primary text-[10.5px] font-semibold"
          >
            {t("retry")}
          </button>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({
  messageId,
  text,
  citations,
  linking,
  reasoning,
  noAnswer,
  isPersisted,
  streaming,
  currentUserId,
}: {
  messageId: string;
  text: string;
  citations: InitialCitation[];
  linking: boolean;
  reasoning?: ReasoningSummary;
  noAnswer: boolean;
  isPersisted: boolean;
  streaming: boolean;
  currentUserId: string;
}) {
  const t = useTranslations("conversation");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <CiteLabel />
        {streaming && <StreamingStatus status="streaming" />}
      </div>
      {reasoning && <ReasoningTrace summary={reasoning} />}
      {linking && (
        <span className="text-warning bg-warning/12 inline-flex h-6 items-center gap-2 self-start rounded-lg px-2.5 text-[11px] font-medium">
          <span className="animate-cite-spin size-3 rounded-full border-[1.5px] border-current border-t-transparent" />
          {t("citations.linking")}
        </span>
      )}
      <MessageBubble role="assistant">
        {noAnswer ? (
          <NoAnswer text={text} />
        ) : (
          <RenderedAssistantText
            text={text}
            citations={citations}
            pending={linking}
            showCursor={streaming}
          />
        )}
        {linking && (
          <p className="text-muted-foreground mt-2.5 text-[11px] leading-relaxed">
            {t("citations.pendingNote")}
          </p>
        )}
        {!noAnswer && isPersisted && (
          <div className="mt-3 flex items-center gap-3 border-t pt-2.5">
            <SupportFooter citations={citations} />
            <div className="ml-auto">
              <CommentButton
                targetType="MESSAGE"
                targetId={messageId}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        )}
      </MessageBubble>
    </div>
  );
}

function RenderedAssistantText({
  text,
  citations,
  pending,
  showCursor,
}: {
  text: string;
  citations: InitialCitation[];
  pending: boolean;
  showCursor: boolean;
}) {
  // Replace [n] (and [n, m]) markers with chips. Splits the string into a
  // sequence of plain-text fragments and CitationChip nodes. Robust to
  // streaming partial markers — anything that doesn't match a complete
  // [digits] pattern renders as plain text.
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  const out: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      out.push(<span key={`t-${cursor}`}>{text.slice(cursor, match.index)}</span>);
    }
    const numbers = match[1]!.split(",").map((s) => Number(s.trim()));
    out.push(
      <span key={`c-${match.index}`} className="inline-flex flex-wrap gap-0.5 align-baseline">
        {numbers.map((n, i) => {
          const citation = citations.find((c) => c.displayIndex === n);
          return (
            <CitationChip
              key={`${n}-${i}`}
              displayIndex={n}
              citation={citation ?? undefined}
              pending={pending}
            />
          );
        })}
      </span>,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    out.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }
  return (
    <div className="leading-relaxed whitespace-pre-wrap">
      {out}
      {showCursor && (
        <span className="bg-primary animate-cite-blink ml-0.5 inline-block h-[1em] w-px align-text-bottom" />
      )}
    </div>
  );
}

interface RawCitation {
  displayIndex: number;
  quote: string;
  chunkId: string;
  documentId: string;
  documentName: string;
  format?: DocumentFormat | null;
  location: unknown;
  verdict?: CitationVerdict | null;
  confidence?: number | null;
}

function parseCitations(raw: RawCitation[]): InitialCitation[] {
  return raw.map((c) => ({
    displayIndex: c.displayIndex,
    quote: c.quote,
    chunkId: c.chunkId,
    documentId: c.documentId,
    documentName: c.documentName,
    format: c.format ?? null,
    location: DocumentLocationSchema.parse(c.location),
    verdict: c.verdict ?? null,
    confidence: c.confidence ?? null,
  }));
}
