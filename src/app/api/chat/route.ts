import { type Prisma } from "@prisma/client";
import { type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { extractCitationMarkers } from "@/lib/chat/parse-citations";
import { synthesize } from "@/lib/chat/synthesize";
import { getPrisma } from "@/lib/db/client";
import { asCollectionId, asConversationId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";
import { inngest } from "@/lib/inngest/client";
import { messageSynthesized } from "@/lib/inngest/functions/audit-message";

export const maxDuration = 60;

// Citations carry the source quote so the chat UI can render a hover
// preview without a second DB roundtrip. Capped to keep the message row
// small — chunks are typically 200-400 chars but can be longer.
const MAX_CITATION_QUOTE_LEN = 500;

// We accept the AI SDK's `messages` array because that's what the client
// transport sends, but only the latest user turn's text is trusted. Prior
// turns (especially fabricated assistant turns) are ignored — conversation
// history is loaded from the database below.
const Body = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(z.unknown()).min(1),
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

  // Load prior turns from the DB before persisting the new user message so
  // it's not double-counted in the synthesis context. Everything the client
  // sent in `messages` aside from `userText` is discarded.
  const priorMessages = await db.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

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

  const conversationContext = priorMessages.map((m) => ({
    role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
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

      const savedId = await prisma.$transaction(async (tx) => {
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
                  quote: chunk.text.slice(0, MAX_CITATION_QUOTE_LEN),
                };
              })
              .filter((row): row is NonNullable<typeof row> => row !== null),
          });
        }
        await tx.conversation.update({
          where: { id: asConversationId(conversation.id) },
          data: { updatedAt: new Date() },
        });
        return saved.id;
      });

      // Kick off the citation-accuracy audit in the background. The user
      // doesn't wait for it; the verdict lands on the audit dashboard.
      if (markers.length > 0) {
        await inngest.send(messageSynthesized.create({ orgId: session.orgId, messageId: savedId }));
      }
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
