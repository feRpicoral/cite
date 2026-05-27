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

// Upper bound for a single user turn. Claude Sonnet's context is much larger,
// but the synthesis prompt also embeds retrieved passages and conversation
// history, and uncapped input is a footgun for cost and prompt injection.
const MAX_USER_TEXT_LEN = 8_000;

// Strict shape for the latest user message: a `text` part with a real string.
// The AI SDK sends a `messages` array of variable shape, so we keep the outer
// wrapper loose and validate only what we actually trust.
const TextPart = z.object({ type: z.literal("text"), text: z.string() });
const LatestUserMessage = z.object({
  role: z.literal("user"),
  parts: z.array(TextPart).min(1),
});

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

  const latestUserRaw = [...parsed.data.messages]
    .reverse()
    .find((m) => (m as { role?: unknown })?.role === "user");
  const latestUserParsed = LatestUserMessage.safeParse(latestUserRaw);
  if (!latestUserParsed.success) {
    return NextResponse.json({ error: "No user message" }, { status: 400 });
  }
  const userText = latestUserParsed.data.parts
    .map((p) => p.text)
    .join("")
    .trim();
  if (userText.length === 0 || userText.length > MAX_USER_TEXT_LEN) {
    return NextResponse.json(
      { error: `Message must be 1–${MAX_USER_TEXT_LEN} characters.` },
      { status: 400 },
    );
  }

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
