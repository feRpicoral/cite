"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
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
