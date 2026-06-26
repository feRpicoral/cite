import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionApi } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

interface Context {
  params: Promise<{ id: string }>;
}

const IdParam = z.string().uuid();

const Patch = z.object({
  title: z.string().trim().min(1).max(120),
});

export async function PATCH(request: Request, context: Context) {
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;
  const { id } = await context.params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const conversation = await db.conversation.findUnique({
    where: { id },
    select: { createdByUserId: true },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.createdByUserId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.conversation.update({
    where: { id },
    data: { title: parsed.data.title },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json(updated);
}
