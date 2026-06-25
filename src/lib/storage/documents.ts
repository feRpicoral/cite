import "server-only";

import { nanoid } from "nanoid";

import type { OrgId } from "@/lib/db/types";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const DOCUMENTS_BUCKET = "cite-documents";

export function buildStoragePath(orgId: OrgId, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `${orgId}/${nanoid()}-${safe}`;
}

export async function uploadDocumentBuffer(
  storagePath: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (error) throw error;
}

export async function removeDocumentBuffer(storagePath: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
  // A missing object is fine: the caller's goal is "blob is gone", which holds.
  if (error && !/not found/i.test(error.message)) throw error;
}

export async function downloadDocumentBuffer(storagePath: string): Promise<Buffer> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(storagePath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function signedDocumentUrl(
  storagePath: string,
  expiresIn: number = 60 * 60,
): Promise<string> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
