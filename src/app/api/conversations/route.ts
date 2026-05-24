import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

const Body = z.object({
  collectionId: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const session = await requireSession();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const collection = await db.collection.findUnique({
    where: { id: parsed.data.collectionId },
    select: { id: true },
  });
  if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const conversation = await db.conversation.create({
    data: {
      orgId: session.orgId,
      collectionId: collection.id,
      title: parsed.data.title ?? "New conversation",
      createdByUserId: session.userId,
    },
  });
  return NextResponse.json({ id: conversation.id });
}
