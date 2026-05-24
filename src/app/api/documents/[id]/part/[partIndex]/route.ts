import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

interface RouteContext {
  params: Promise<{ id: string; partIndex: string }>;
}

/**
 * Returns one DocumentPart for the HTML-family viewer. For HTML/MD/DOCX,
 * each part's `body` is sanitized HTML; the viewer renders it directly
 * and then resolves the citation's selector + char range to a DOM Range
 * for highlighting.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  const { id, partIndex: partIndexRaw } = await context.params;
  const partIndex = Number.parseInt(partIndexRaw, 10);
  if (!Number.isFinite(partIndex) || partIndex < 0) {
    return NextResponse.json({ error: "Invalid part index" }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const part = await db.documentPart.findUnique({
    where: { documentId_index: { documentId: id, index: partIndex } },
    select: { body: true, metadata: true, index: true },
  });
  if (!part) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(part);
}
