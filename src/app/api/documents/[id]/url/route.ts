import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionApi } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { signedDocumentUrl } from "@/lib/storage/documents";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const IdParam = z.string().uuid();

/**
 * Returns a short-lived signed URL the viewer can fetch the raw file from.
 * Tenant-scoped via `getDb(orgId)` so org-leaks return 404 even if the id
 * is guessed.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;
  const { id } = await context.params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  const db = getDb(session.orgId);
  const doc = await db.document.findUnique({
    where: { id },
    select: { id: true, format: true, name: true, storagePath: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await signedDocumentUrl(doc.storagePath, 60 * 5);
  return NextResponse.json({ url, format: doc.format, name: doc.name });
}
