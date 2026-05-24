import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { DocumentLocationSchema } from "@/lib/ingestion/location";

const Body = z.discriminatedUnion("targetType", [
  z.object({
    targetType: z.literal("MESSAGE"),
    targetId: z.string().uuid(),
    body: z.string().trim().min(1).max(2_000),
  }),
  z.object({
    targetType: z.literal("DOCUMENT_REGION"),
    targetId: z.string().uuid(),
    body: z.string().trim().min(1).max(2_000),
    location: DocumentLocationSchema,
  }),
]);

export async function POST(request: Request) {
  const session = await requireSession();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const data = parsed.data;
  const comment = await db.comment.create({
    data: {
      orgId: session.orgId,
      targetType: data.targetType,
      targetId: data.targetId,
      body: data.body,
      authorUserId: session.userId,
      location: data.targetType === "DOCUMENT_REGION" ? data.location : undefined,
    },
  });
  return NextResponse.json({ id: comment.id });
}

const ListQuery = z.object({
  targetType: z.enum(["MESSAGE", "DOCUMENT_REGION"]),
  targetId: z.string().uuid(),
});

export async function GET(request: Request) {
  const session = await requireSession();
  const url = new URL(request.url);
  const parsed = ListQuery.safeParse({
    targetType: url.searchParams.get("targetType"),
    targetId: url.searchParams.get("targetId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const comments = await db.comment.findMany({
    where: { targetType: parsed.data.targetType, targetId: parsed.data.targetId },
    orderBy: { createdAt: "asc" },
    include: {
      replies: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json({ comments });
}
