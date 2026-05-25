/**
 * Client-side helper that POSTs a single file to the upload endpoint.
 * Shared by the header button and the drop zone so both code paths show
 * the same toast and error handling.
 */
export async function uploadDocument(file: File, collectionId: string): Promise<void> {
  const fd = new FormData();
  fd.set("collectionId", collectionId);
  fd.set("file", file);

  const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }
}
