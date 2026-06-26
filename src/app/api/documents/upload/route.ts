import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionApi } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from "@/lib/documents/upload-constraints";
import { matchesDeclaredType } from "@/lib/ingestion/magic-bytes";
import { documentUploaded, inngest } from "@/lib/inngest/client";
import { buildStoragePath, uploadDocumentBuffer } from "@/lib/storage/documents";

const Body = z.object({
  collectionId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const form = await request.formData();
  const parsed = Body.safeParse({ collectionId: form.get("collectionId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid collectionId" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const format = ALLOWED_UPLOAD_MIME[file.type];
  if (!format) {
    return NextResponse.json(
      { error: `Unsupported mime type: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }

  const db = getDb(session.orgId);
  const collection = await db.collection.findUnique({ where: { id: parsed.data.collectionId } });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesDeclaredType(file.type, buffer)) {
    return NextResponse.json(
      { error: `Content does not match declared type: ${file.type}` },
      { status: 415 },
    );
  }

  const storagePath = buildStoragePath(session.orgId, file.name);
  await uploadDocumentBuffer(storagePath, buffer, file.type);

  const document = await db.document.create({
    data: {
      orgId: session.orgId,
      collectionId: collection.id,
      name: file.name,
      format,
      status: "UPLOADING",
      storagePath,
      mimeType: file.type,
      sizeBytes: file.size,
      createdByUserId: session.userId,
    },
  });

  await inngest.send(documentUploaded.create({ orgId: session.orgId, documentId: document.id }));

  return NextResponse.json({ id: document.id }, { status: 202 });
}
