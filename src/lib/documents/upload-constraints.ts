import type { DocumentFormat } from "@prisma/client";

// Vercel Functions cap the incoming request body at ~4.5MB; anything larger is
// rejected by the platform before the upload handler runs, so advertising more
// fails in production. Direct-to-storage upload would lift this but is out of
// scope.
export const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME: Record<string, DocumentFormat> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/html": "HTML",
  "text/markdown": "MD",
  "text/plain": "MD",
};

export const UPLOAD_ACCEPT = [
  ".pdf",
  ".docx",
  ".html",
  ".md",
  ...Object.keys(ALLOWED_UPLOAD_MIME),
].join(",");

const EXTENSION_FORMAT: Record<string, DocumentFormat> = {
  pdf: "PDF",
  docx: "DOCX",
  html: "HTML",
  htm: "HTML",
  md: "MD",
  markdown: "MD",
  txt: "MD",
};

// Browsers sometimes report an empty or generic MIME for Markdown/HTML, so the
// extension is the reliable signal client-side before the request is sent.
export function isSupportedUpload(file: File): boolean {
  if (ALLOWED_UPLOAD_MIME[file.type]) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? ext in EXTENSION_FORMAT : false;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
