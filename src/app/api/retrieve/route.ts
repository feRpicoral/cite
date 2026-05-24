import { NextResponse } from "next/server";
import { z } from "zod";

import { runAgent } from "@/lib/agents/runner";
import { requireAdmin } from "@/lib/auth/session";
import { asCollectionId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

const Body = z.object({
  collectionId: z.string().uuid(),
  query: z.string().trim().min(1).max(2_000),
  topK: z.number().int().min(1).max(50).optional(),
});

/**
 * Admin-only retrieval endpoint. Used for the eval harness and the
 * citation-accuracy audit dashboard (Phase 8). Production chat goes
 * through /api/chat (Phase 5), which calls runAgent internally and
 * streams the synthesis.
 */
export async function POST(request: Request) {
  const session = await requireAdmin();
  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Membership-scoped lookup verifies the collection belongs to the caller's
  // org before any retrieval — defense in depth alongside the SQL WHERE clause.
  const db = getDb(session.orgId);
  const collection = await db.collection.findUnique({
    where: { id: parsed.data.collectionId },
    select: { id: true },
  });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const state = await runAgent({
    orgId: session.orgId,
    collectionId: asCollectionId(collection.id),
    query: parsed.data.query,
    topK: parsed.data.topK ?? 10,
  });

  return NextResponse.json({
    query: state.query,
    classify: state.classify,
    subQueries: state.subQueries,
    sufficiency: state.sufficiency,
    chunks: state.finalChunks,
  });
}
