import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionApi } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

const Query = z.object({
  collectionId: z.string().uuid(),
});

export async function GET(request: Request) {
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const parsed = Query.safeParse({ collectionId: searchParams.get("collectionId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid collectionId" }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const collection = await db.collection.findUnique({
    where: { id: parsed.data.collectionId },
    select: { id: true },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const documents = await db.document.findMany({
    where: { collectionId: collection.id },
    select: {
      id: true,
      status: true,
      errorMessage: true,
      pageCount: true,
    },
  });

  return NextResponse.json({ documents });
}
