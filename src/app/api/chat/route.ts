import { type Prisma } from "@prisma/client";
import { convertToModelMessages, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { extractCitationMarkers } from "@/lib/chat/parse-citations";
import { synthesize } from "@/lib/chat/synthesize";
import { getPrisma } from "@/lib/db/client";
import { asCollectionId, asConversationId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

export const maxDuration = 60;

const Body = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(z.unknown()),
});

export async function POST(request: Request) {
  const session = await requireSession();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const conversation = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { id: true, collectionId: true },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uiMessages = parsed.data.messages as UIMessage[];
  const latestUser = [...uiMessages].reverse().find((m) => m.role === "user");
  if (!latestUser) {
    return NextResponse.json({ error: "No user message" }, { status: 400 });
  }
  const userText = uiMessageText(latestUser);

  // Persist the user message immediately so the conversation history survives
  // a crash mid-stream.
  await db.message.create({
    data: {
      orgId: session.orgId,
      conversationId: conversation.id,
      role: "USER",
      content: userText,
    },
  });

  const conversationContext = uiMessages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: uiMessageText(m),
  }));

  const { stream, state } = await synthesize({
    orgId: session.orgId,
    collectionId: asCollectionId(conversation.collectionId),
    query: userText,
    conversationContext,
  });

  return stream.toUIMessageStreamResponse({
    onFinish: async ({ messages }) => {
      const assistant = messages.at(-1);
      if (!assistant) return;
      const content = uiMessageText(assistant);
      const markers = extractCitationMarkers(content);
      const prisma = getPrisma();

      await prisma.$transaction(async (tx) => {
        const saved = await tx.message.create({
          data: {
            orgId: session.orgId,
            conversationId: conversation.id,
            role: "ASSISTANT",
            content,
            agentState: state as unknown as Prisma.InputJsonValue,
          },
        });
        if (markers.length > 0) {
          await tx.messageCitation.createMany({
            data: markers
              .map((displayIndex) => {
                const chunk = state.finalChunks[displayIndex - 1];
                if (!chunk) return null;
                return {
                  orgId: session.orgId,
                  messageId: saved.id,
                  chunkId: chunk.chunkId,
                  displayIndex,
                  quote: chunk.text.slice(0, 500),
                };
              })
              .filter((row): row is NonNullable<typeof row> => row !== null),
          });
        }
        await tx.conversation.update({
          where: { id: asConversationId(conversation.id) },
          data: { updatedAt: new Date() },
        });
      });
    },
  });
}

function uiMessageText(m: UIMessage): string {
  const parts = (m.parts ?? []) as Array<{ type: string; text?: string }>;
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

// Silence unused-import warning when convertToModelMessages isn't referenced
// directly in this file.
void convertToModelMessages;
