import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { parseLocation } from "@/lib/ingestion/location";

import type { InitialMessage } from "./chat-panel";
import { ConversationLayout } from "./conversation-layout";

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params;
  const session = await requireSession();
  const db = getDb(session.orgId);

  const conversation = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      collection: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          agentState: true,
          citations: {
            select: {
              displayIndex: true,
              quote: true,
              chunk: {
                select: {
                  id: true,
                  documentId: true,
                  location: true,
                  document: { select: { name: true, format: true } },
                },
              },
            },
            orderBy: { displayIndex: "asc" },
          },
        },
      },
    },
  });
  if (!conversation) notFound();

  const messageIds = conversation.messages.map((m) => m.id);
  const audits = await db.citationAudit.findMany({
    where: { messageId: { in: messageIds } },
    select: { messageId: true, displayIndex: true, verdict: true, confidence: true },
  });
  const auditByKey = new Map(audits.map((a) => [`${a.messageId}:${a.displayIndex}`, a]));

  const initial: InitialMessage[] = conversation.messages.map((m) => ({
    id: m.id,
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
    agentState: m.agentState ?? null,
    citations: m.citations.map((c) => {
      const audit = auditByKey.get(`${m.id}:${c.displayIndex}`);
      return {
        displayIndex: c.displayIndex,
        quote: c.quote,
        chunkId: c.chunk.id,
        documentId: c.chunk.documentId,
        documentName: c.chunk.document.name,
        format: c.chunk.document.format,
        location: parseLocation(c.chunk.location),
        verdict: audit?.verdict ?? null,
        confidence: audit?.confidence ?? null,
      };
    }),
  }));

  return (
    <ConversationLayout
      conversationId={conversation.id}
      title={conversation.title}
      collectionName={conversation.collection.name}
      initialMessages={initial}
      me={{ userId: session.userId, name: session.userName }}
    />
  );
}
