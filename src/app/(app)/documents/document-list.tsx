import { type DocumentStatus } from "@prisma/client";

import { DocumentDropzone } from "@/components/document-dropzone";
import { DocumentUpload } from "@/components/document-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

const STATUS_LABEL: Record<DocumentStatus, string> = {
  UPLOADING: "Uploading",
  EXTRACTING: "Extracting",
  CHUNKING: "Chunking",
  EMBEDDING: "Embedding",
  INDEXED: "Indexed",
  FAILED: "Failed",
};

const STATUS_BUSY = new Set<DocumentStatus>(["UPLOADING", "EXTRACTING", "CHUNKING", "EMBEDDING"]);

export async function DocumentList({
  collectionId,
  collectionName,
}: {
  collectionId: string;
  collectionName: string;
}) {
  const session = await requireSession();
  const db = getDb(session.orgId);

  const documents = await db.document.findMany({
    where: { collectionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      format: true,
      status: true,
      pageCount: true,
      sizeBytes: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight">{collectionName}</h1>
          <p className="text-muted-foreground text-xs">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </p>
        </div>
        <DocumentUpload collectionId={collectionId} />
      </header>
      <DocumentDropzone collectionId={collectionId}>
        {documents.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
            <p className="text-muted-foreground text-sm">No documents yet.</p>
            <p className="text-muted-foreground/70 text-xs">
              Drop a file here, or use the upload button. PDF, DOCX, HTML, or Markdown.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {documents.map((doc) => {
              const busy = STATUS_BUSY.has(doc.status);
              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-4 px-6 py-3 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium">{doc.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {doc.format} · {formatBytes(doc.sizeBytes)} · {formatDate(doc.createdAt)}
                    </p>
                    {doc.status === "FAILED" && doc.errorMessage && (
                      <p className="text-destructive text-xs">{doc.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {busy ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <span
                        className={`text-xs ${doc.status === "FAILED" ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {STATUS_LABEL[doc.status]}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DocumentDropzone>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(d: Date): string {
  return DATE_FORMAT.format(d);
}
