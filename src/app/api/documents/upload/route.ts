import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { documentUploaded, inngest } from "@/lib/inngest/client";
import { buildStoragePath, uploadDocumentBuffer } from "@/lib/storage/documents";

const ALLOWED_FORMATS: Record<string, "PDF" | "DOCX" | "HTML" | "MD"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/html": "HTML",
  "text/markdown": "MD",
  "text/plain": "MD",
};

const MAX_SIZE_BYTES = 100 * 1024 * 1024;

const Body = z.object({
  collectionId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await requireSession();
  const form = await request.formData();
  const parsed = Body.safeParse({ collectionId: form.get("collectionId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid collectionId" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const format = ALLOWED_FORMATS[file.type];
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

  const storagePath = buildStoragePath(session.orgId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
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
