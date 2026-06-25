"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { CitationChip } from "@/components/chat/citation-chip";
import { MessageBubble } from "@/components/chat/message-bubble";
import { StreamingStatus } from "@/components/chat/streaming-status";
import { CommentButton } from "@/components/comments/comment-button";
import { type DocumentLocation, DocumentLocationSchema } from "@/lib/ingestion/location";
import { type MessageInsertPayload, useMessageInserts } from "@/lib/realtime/message-sync";
import { findReconcilableMessageIndex } from "@/lib/realtime/reconcile";

export interface InitialCitation {
  displayIndex: number;
  quote: string;
  chunkId: string;
  documentId: string;
  documentName: string;
  location: DocumentLocation;
}

export interface InitialMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: InitialCitation[];
}

interface ChatPanelProps {
  conversationId: string;
  initialMessages: InitialMessage[];
  collectionName: string;
  currentUserId: string;
}

export function ChatPanel({
  conversationId,
  initialMessages,
  collectionName,
  currentUserId,
}: ChatPanelProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }),
    [conversationId],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport,
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
    })),
  });

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

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Hydrate citations for any persisted assistant message we haven't fetched
  // yet. Triggers right after onIncoming rewrites a streamed id to the
  // persisted UUID, so the chips in the just-finished response become
  // clickable without a refresh.
  useEffect(() => {
    let cancelled = false;
    const targets = messages.filter(
      (m) =>
        m.role === "assistant" &&
        /^[0-9a-f-]{36}$/.test(m.id) &&
        !fetchedCitationsRef.current.has(m.id),
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
      const next = new Map(citationsByMessage);
      let changed = false;
      for (const entry of results) {
        if (!entry) continue;
        const [id, citations] = entry;
        next.set(id, citations);
        changed = true;
      }
      if (changed) setCitationsByMessage(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, citationsByMessage]);

  return (
    <div className="flex flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {messages.length === 0 && (
            <div className="text-muted-foreground text-center text-sm">
              Ask anything about the documents in {collectionName}.
            </div>
          )}
          {messages.map((m) => {
            const text = m.parts
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("");
            const citations = citationsByMessage.get(m.id) ?? [];
            // Persisted messages have a real UUID — those can host comments.
            // Streaming-only IDs (assigned by useChat) get filtered out.
            const isPersisted = /^[0-9a-f-]{36}$/.test(m.id);
            return (
              <div key={m.id} className="group flex items-start gap-1">
                <div className="flex-1">
                  <MessageBubble role={m.role === "user" ? "user" : "assistant"}>
                    {m.role === "assistant" ? (
                      <RenderedAssistantText text={text} citations={citations} />
                    ) : (
                      <p className="whitespace-pre-wrap">{text}</p>
                    )}
                  </MessageBubble>
                </div>
                {isPersisted && (
                  <CommentButton
                    targetType="MESSAGE"
                    targetId={m.id}
                    currentUserId={currentUserId}
                  />
                )}
              </div>
            );
          })}
          <StreamingStatus status={status} onStop={stop} />
        </div>
      </div>
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-t px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <ChatComposer
            onSend={(content) => sendMessage({ text: content })}
            disabled={status === "streaming" || status === "submitted"}
          />
        </div>
      </div>
    </div>
  );
}

function RenderedAssistantText({
  text,
  citations,
}: {
  text: string;
  citations: InitialCitation[];
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
            <CitationChip key={`${n}-${i}`} displayIndex={n} citation={citation ?? undefined} />
          );
        })}
      </span>,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    out.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }
  return <div className="leading-relaxed whitespace-pre-wrap">{out}</div>;
}

interface RawCitation {
  displayIndex: number;
  quote: string;
  chunkId: string;
  documentId: string;
  documentName: string;
  location: unknown;
}

function parseCitations(raw: RawCitation[]): InitialCitation[] {
  return raw.map((c) => ({
    displayIndex: c.displayIndex,
    quote: c.quote,
    chunkId: c.chunkId,
    documentId: c.documentId,
    documentName: c.documentName,
    location: DocumentLocationSchema.parse(c.location),
  }));
}
