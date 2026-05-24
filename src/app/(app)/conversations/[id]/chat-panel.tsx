"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { CitationChip } from "@/components/chat/citation-chip";
import { MessageBubble } from "@/components/chat/message-bubble";
import { StreamingStatus } from "@/components/chat/streaming-status";
import type { DocumentLocation } from "@/lib/ingestion/location";

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
}

export function ChatPanel({ conversationId, initialMessages, collectionName }: ChatPanelProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }),
    [conversationId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
    })),
  });

  const citationsByMessage = useMemo(() => {
    const map = new Map<string, InitialCitation[]>();
    for (const m of initialMessages) map.set(m.id, m.citations);
    return map;
  }, [initialMessages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

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
            return (
              <MessageBubble key={m.id} role={m.role === "user" ? "user" : "assistant"}>
                {m.role === "assistant" ? (
                  <RenderedAssistantText text={text} citations={citations} />
                ) : (
                  <p className="whitespace-pre-wrap">{text}</p>
                )}
              </MessageBubble>
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
