import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

interface Context {
  params: Promise<{ id: string }>;
}

const Patch = z.object({
  resolved: z.boolean(),
});

const IdParam = z.string().uuid();

export async function PATCH(request: Request, context: Context) {
  const session = await requireSession();
  const { id } = await context.params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const db = getDb(session.orgId);
  const comment = await db.comment.findUnique({
    where: { id },
    select: { authorUserId: true },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorUserId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.comment.update({
    where: { id },
    data: { resolvedAt: parsed.data.resolved ? new Date() : null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const session = await requireSession();
  const { id } = await context.params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }
  const db = getDb(session.orgId);
  const comment = await db.comment.findUnique({
    where: { id },
    select: { authorUserId: true },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Match the UI: the kebab menu hides Delete for non-authors. Without this
  // check anyone in the org with the id could call DELETE directly.
  if (comment.authorUserId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
