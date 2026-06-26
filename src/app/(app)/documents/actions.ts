"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { documentUploaded, inngest } from "@/lib/inngest/client";
import { removeDocumentBuffer } from "@/lib/storage/documents";

const CreateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional(),
});

export type CreateCollectionState = { error?: string };

export async function createCollectionAction(
  _prev: CreateCollectionState,
  formData: FormData,
): Promise<CreateCollectionState> {
  const parsed = CreateCollectionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requireSession();
  const db = getDb(session.orgId);
  await db.collection.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      createdByUserId: session.userId,
    },
  });
  revalidatePath("/documents");
  return {};
}

const DeleteDocumentSchema = z.object({ id: z.string().uuid() });

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const parsed = DeleteDocumentSchema.parse({ id: formData.get("id") });
  const session = await requireSession();
  const db = getDb(session.orgId);
  const document = await db.document.findUnique({
    where: { id: parsed.id },
    select: { storagePath: true },
  });
  if (document) {
    try {
      await removeDocumentBuffer(document.storagePath);
    } catch {
      // Storage failures must not block the row delete; an orphaned blob is
      // recoverable, a row that won't delete is not.
    }
  }
  await db.document.delete({ where: { id: parsed.id } });
  revalidatePath("/documents");
}

const RenameDocumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
});

export async function renameDocumentAction(formData: FormData): Promise<void> {
  const parsed = RenameDocumentSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  const session = await requireSession();
  const db = getDb(session.orgId);
  await db.document.update({
    where: { id: parsed.id },
    data: { name: parsed.name },
  });
  revalidatePath("/documents");
}

const RetryIngestionSchema = z.object({ id: z.string().uuid() });

export async function retryIngestionAction(formData: FormData): Promise<void> {
  const parsed = RetryIngestionSchema.parse({ id: formData.get("id") });
  const session = await requireSession();
  const db = getDb(session.orgId);
  const document = await db.document.findUnique({
    where: { id: parsed.id },
    select: { id: true, status: true },
  });
  if (!document || document.status !== "FAILED") return;

  await db.document.update({
    where: { id: parsed.id },
    data: { status: "UPLOADING", errorMessage: null },
  });
  await inngest.send(documentUploaded.create({ orgId: session.orgId, documentId: document.id }));
  revalidatePath("/documents");
}

const UpdateCollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional(),
});

export type UpdateCollectionState = { error?: string };

export async function updateCollectionAction(
  _prev: UpdateCollectionState,
  formData: FormData,
): Promise<UpdateCollectionState> {
  const parsed = UpdateCollectionSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const session = await requireSession();
  const db = getDb(session.orgId);
  await db.collection.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
  });
  revalidatePath("/documents");
  return {};
}

const DeleteCollectionSchema = z.object({ id: z.string().uuid() });

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  const parsed = DeleteCollectionSchema.parse({ id: formData.get("id") });
  const session = await requireSession();
  const db = getDb(session.orgId);
  const documents = await db.document.findMany({
    where: { collectionId: parsed.id },
    select: { storagePath: true },
  });
  for (const doc of documents) {
    try {
      await removeDocumentBuffer(doc.storagePath);
    } catch {
      // Storage failures must not block the row delete; an orphaned blob is
      // recoverable, a row that won't delete is not.
    }
  }
  await db.collection.delete({ where: { id: parsed.id } });
  revalidatePath("/documents");
}
