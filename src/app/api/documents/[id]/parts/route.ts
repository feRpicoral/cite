import { NextResponse } from "next/server";

import { requireSessionApi } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Returns every DocumentPart for the HTML-family viewer in render order.
 * The viewer wraps each in a `[data-part-index="N"]` element so the
 * citation locator can scope its selector lookup to the right part.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;
  const { id } = await context.params;

  const db = getDb(session.orgId);
  const doc = await db.document.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parts = await db.documentPart.findMany({
    where: { documentId: id },
    orderBy: { index: "asc" },
    select: { index: true, body: true, metadata: true },
  });
  return NextResponse.json({ parts });
}
