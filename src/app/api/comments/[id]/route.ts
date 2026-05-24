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

export async function PATCH(request: Request, context: Context) {
  const session = await requireSession();
  const { id } = await context.params;
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const db = getDb(session.orgId);
  await db.comment.update({
    where: { id },
    data: { resolvedAt: parsed.data.resolved ? new Date() : null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const session = await requireSession();
  const { id } = await context.params;
  const db = getDb(session.orgId);
  await db.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
