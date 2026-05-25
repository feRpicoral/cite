import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
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
  const session = await requireSession();
  const { id } = await context.params;

  const db = getDb(session.orgId);
  const parts = await db.documentPart.findMany({
    where: { documentId: id },
    orderBy: { index: "asc" },
    select: { index: true, body: true, metadata: true },
  });
  return NextResponse.json({ parts });
}
