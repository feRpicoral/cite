import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { parseLocation } from "@/lib/ingestion/location";

import { ChatPanel, type InitialMessage } from "./chat-panel";

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
          citations: {
            select: {
              displayIndex: true,
              quote: true,
              chunk: {
                select: {
                  id: true,
                  documentId: true,
                  location: true,
                  document: { select: { name: true } },
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

  const initial: InitialMessage[] = conversation.messages.map((m) => ({
    id: m.id,
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
    citations: m.citations.map((c) => ({
      displayIndex: c.displayIndex,
      quote: c.quote,
      chunkId: c.chunk.id,
      documentId: c.chunk.documentId,
      documentName: c.chunk.document.name,
      location: parseLocation(c.chunk.location),
    })),
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b px-6 py-3">
        <h1 className="truncate text-base font-semibold">{conversation.title}</h1>
        <p className="text-muted-foreground text-xs">{conversation.collection.name}</p>
      </header>
      <ChatPanel
        conversationId={conversation.id}
        initialMessages={initial}
        collectionName={conversation.collection.name}
      />
    </div>
  );
}
