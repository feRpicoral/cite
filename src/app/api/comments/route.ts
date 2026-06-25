import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionApi } from "@/lib/auth/session";
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
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const data = parsed.data;

  // `targetId` is polymorphic (no DB FK), so validate it points at a row in
  // the caller's org. The auto-scoped lookups return null for wrong-org or
  // unknown ids, preventing orphan/fake comments and cross-org targeting.
  if (data.targetType === "MESSAGE") {
    const message = await db.message.findUnique({
      where: { id: data.targetId },
      select: { id: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Target message not found" }, { status: 404 });
    }
  } else {
    const document = await db.document.findUnique({
      where: { id: data.targetId },
      select: { id: true, format: true, pageCount: true },
    });
    if (!document) {
      return NextResponse.json({ error: "Target document not found" }, { status: 404 });
    }
    // PDFs use spatial locations (`kind: "pdf"`); DOCX/HTML/MD use the
    // structural HTML locator. Reject mismatches so the viewer doesn't
    // get a region it can't render.
    const expectedKind = document.format === "PDF" ? "pdf" : "html";
    if (data.location.kind !== expectedKind) {
      return NextResponse.json(
        { error: "Location does not match document format" },
        { status: 400 },
      );
    }
    if (data.location.kind === "pdf") {
      // pageCount is null until ingestion finishes; only enforce the bound
      // when we have it.
      if (document.pageCount != null && data.location.page >= document.pageCount) {
        return NextResponse.json({ error: "Location page out of bounds" }, { status: 400 });
      }
    } else {
      const part = await db.documentPart.findUnique({
        where: {
          documentId_index: {
            documentId: document.id,
            index: data.location.partIndex,
          },
        },
        select: { id: true },
      });
      if (!part) {
        return NextResponse.json({ error: "Location part not found" }, { status: 400 });
      }
    }
  }

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
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;
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
