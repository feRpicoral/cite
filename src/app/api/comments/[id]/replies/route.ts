import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionApi } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

const Body = z.object({
  body: z.string().trim().min(1).max(2_000),
});

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: Context) {
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;
  const { id } = await context.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb(session.orgId);
  // Verify the parent comment is in the caller's org (the extension scopes
  // by orgId, so a wrong-org id returns null).
  const parent = await db.comment.findUnique({ where: { id }, select: { id: true } });
  if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reply = await db.commentReply.create({
    data: {
      orgId: session.orgId,
      commentId: parent.id,
      authorUserId: session.userId,
      body: parsed.data.body,
    },
  });
  return NextResponse.json({ id: reply.id });
}
