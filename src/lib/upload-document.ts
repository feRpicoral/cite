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
