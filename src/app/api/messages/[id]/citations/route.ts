import { NextResponse } from "next/server";

import { requireSessionApi } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { parseLocation } from "@/lib/ingestion/location";

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * Returns the saved citation list for an assistant message. Used by the
 * chat panel to hydrate fresh streaming responses — the inline `[n]` chips
 * are emitted by the model as text, but the citation rows are only written
 * server-side in the chat route's `onFinish`, so the client refetches them
 * once the message lands.
 */
export async function GET(_request: Request, context: Context) {
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;
  const { id } = await context.params;

  const db = getDb(session.orgId);
  const message = await db.message.findUnique({
    where: { id },
    select: {
      id: true,
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
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    citations: message.citations.map((c) => ({
      displayIndex: c.displayIndex,
      quote: c.quote,
      chunkId: c.chunk.id,
      documentId: c.chunk.documentId,
      documentName: c.chunk.document.name,
      location: parseLocation(c.chunk.location),
    })),
  });
}
