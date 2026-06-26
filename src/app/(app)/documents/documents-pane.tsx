"use client";

import type { DocumentFormat, DocumentStatus } from "@prisma/client";
import { Loader2, MoreVertical, Pencil, RotateCw, Trash2, Upload, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/cite/confirm-dialog";
import { FormatBadge } from "@/components/cite/format-badge";
import { IngestionStatus } from "@/components/cite/ingestion-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatBytes,
  isSupportedUpload,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
} from "@/lib/documents/upload-constraints";
import { uploadDocument } from "@/lib/upload-document";

import { deleteDocumentAction, renameDocumentAction, retryIngestionAction } from "./actions";

export interface DocumentRow {
  id: string;
  name: string;
  format: DocumentFormat;
  status: DocumentStatus;
  sizeBytes: number;
  errorMessage: string | null;
  createdAt: Date;
}

const FAILED: DocumentStatus = "FAILED";

export function DocumentsPane({
  collectionId,
  collectionName,
  collectionDescription,
  documents,
}: {
  collectionId: string;
  collectionName: string;
  collectionDescription: string | null;
  documents: DocumentRow[];
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragCounter = useRef(0);

  const maxLabel = formatBytes(MAX_UPLOAD_BYTES);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(t("upload2.tooLarge", { size: formatBytes(file.size), max: maxLabel }));
          continue;
        }
        if (!isSupportedUpload(file)) {
          toast.error(t("upload2.unsupported"));
          continue;
        }
        try {
          await uploadDocument(file, collectionId);
          toast.success(t("upload2.success", { name: file.name }));
        } catch (err) {
          toast.error(
            t("upload2.failed", {
              name: file.name,
              error: err instanceof Error ? err.message : "failed",
            }),
          );
        }
      }
      setUploading(false);
      router.refresh();
    },
    [collectionId, maxLabel, router, t],
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback(() => {
    dragCounter.current = Math.max(dragCounter.current - 1, 0);
    if (dragCounter.current === 0) setDragActive(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      dragCounter.current = 0;
      void uploadFiles(Array.from(e.dataTransfer.files));
    },
    [uploadFiles],
  );

  const onPick = () => inputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void uploadFiles(Array.from(e.target.files ?? []));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className="relative flex min-w-0 flex-1 flex-col"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={onInputChange}
      />

      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-5">
        <div className="min-w-0">
          <h1 className="font-heading truncate text-base font-semibold tracking-tight">
            {collectionName}
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            {collectionDescription ? `${collectionDescription} · ` : ""}
            {t("documentCount", { count: documents.length })}
          </p>
        </div>
        <Button className="ml-auto" onClick={onPick} disabled={uploading}>
          {uploading ? <Loader2 className="animate-cite-spin" /> : <Upload />}
          {t("upload")}
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-5">
          {documents.length === 0 ? (
            <EmptyCollection onUpload={onPick} maxLabel={maxLabel} />
          ) : (
            <>
              <button
                type="button"
                onClick={onPick}
                className="border-border text-muted-foreground hover:border-primary/50 hover:text-foreground mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed text-xs font-medium transition-colors"
              >
                <UploadCloud className="size-4" />
                <span>
                  {t.rich("dropHint", {
                    browse: (chunks) => (
                      <span className="text-primary font-semibold">{chunks}</span>
                    ),
                  })}{" "}
                  · {t("formatHint")} · {t("sizeHint", { size: maxLabel })}
                </span>
              </button>

              <div className="text-muted-foreground hidden items-center gap-3 px-3 pb-2 font-mono text-[10px] font-semibold tracking-wider uppercase sm:flex">
                <span className="flex-1">{t("column.name")}</span>
                <span className="w-16">{t("column.size")}</span>
                <span className="w-16">{t("column.added")}</span>
                <span className="w-28">{t("column.status")}</span>
                <span className="w-7" />
              </div>

              <ul className="bg-card divide-border divide-y overflow-hidden rounded-xl border">
                {documents.map((doc) => (
                  <DocumentItem key={doc.id} doc={doc} onRefresh={() => router.refresh()} />
                ))}
              </ul>
            </>
          )}
        </div>
      </ScrollArea>

      {dragActive && <DropOverlay collectionName={collectionName} maxLabel={maxLabel} />}
    </div>
  );
}

function DocumentItem({ doc, onRefresh }: { doc: DocumentRow; onRefresh: () => void }) {
  const t = useTranslations("documents");
  const format = useFormatter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function open() {
    window.open(`/api/documents/${doc.id}/url`, "_blank", "noopener,noreferrer");
  }

  function retry() {
    const fd = new FormData();
    fd.set("id", doc.id);
    startTransition(async () => {
      await retryIngestionAction(fd);
      toast.success(t("toast.retrying"));
      onRefresh();
    });
  }

  function confirmDelete() {
    const fd = new FormData();
    fd.set("id", doc.id);
    startTransition(async () => {
      await deleteDocumentAction(fd);
      toast.success(t("toast.deleted"));
      setDeleteOpen(false);
      onRefresh();
    });
  }

  return (
    <li className="flex items-center gap-3 px-3 py-3 text-sm">
      <FormatBadge format={doc.format} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{doc.name}</p>
        <p className="text-muted-foreground mt-0.5 font-mono text-[11px] sm:hidden">
          {formatBytes(doc.sizeBytes)} ·{" "}
          {format.dateTime(doc.createdAt, { month: "short", day: "numeric" })}
        </p>
        {doc.status === FAILED && doc.errorMessage && (
          <p className="text-destructive mt-1 line-clamp-2 text-xs sm:hidden">{doc.errorMessage}</p>
        )}
      </div>
      <span className="text-muted-foreground hidden w-16 font-mono text-[11px] sm:block">
        {formatBytes(doc.sizeBytes)}
      </span>
      <span className="text-muted-foreground hidden w-16 font-mono text-[11px] sm:block">
        {format.dateTime(doc.createdAt, { month: "short", day: "numeric" })}
      </span>
      <span className="flex w-auto items-center gap-2 sm:w-28">
        <IngestionStatus status={doc.status} errorMessage={doc.errorMessage} />
        {doc.status === FAILED && (
          <button
            type="button"
            onClick={retry}
            disabled={pending}
            className="text-primary text-[10px] font-semibold hover:underline disabled:opacity-50"
          >
            {t("status.retry")}
          </button>
        )}
      </span>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("rowActions.label")}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={open}>{t("rowActions.open")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil />
            {t("rowActions.rename")}
          </DropdownMenuItem>
          {doc.status === FAILED && (
            <DropdownMenuItem onSelect={retry}>
              <RotateCw />
              {t("rowActions.retry")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            {t("rowActions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        id={doc.id}
        initialName={doc.name}
        onDone={onRefresh}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        destructive
        icon={<Trash2 />}
        title={t("deleteDocument.title", { name: doc.name })}
        description={t("deleteDocument.description")}
        confirmLabel={t("deleteDocument.confirm")}
        loading={pending}
        onConfirm={confirmDelete}
      />
    </li>
  );
}

function RenameDialog({
  open,
  onOpenChange,
  id,
  initialName,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  initialName: string;
  onDone: () => void;
}) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("name", trimmed);
    startTransition(async () => {
      await renameDocumentAction(fd);
      toast.success(t("toast.renamed"));
      onOpenChange(false);
      onDone();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setName(initialName);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rename.title")}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          maxLength={255}
          aria-label={t("rename.label")}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={save} disabled={pending || name.trim().length === 0}>
            {pending && <Loader2 className="animate-cite-spin" />}
            {t("rename.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyCollection({ onUpload, maxLabel }: { onUpload: () => void; maxLabel: string }) {
  const t = useTranslations("documents");
  return (
    <button
      type="button"
      onClick={onUpload}
      className="border-border hover:border-primary/50 flex min-h-[320px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors"
    >
      <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-xl">
        <UploadCloud className="size-6" />
      </div>
      <h2 className="font-heading text-base font-semibold">{t("empty.emptyCollectionTitle")}</h2>
      <p className="text-muted-foreground mt-1.5 max-w-xs text-sm">
        {t("empty.emptyCollectionBody", { size: maxLabel })}
      </p>
      <span className="bg-primary text-primary-foreground mt-5 inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold">
        {t("empty.uploadDocuments")}
      </span>
    </button>
  );
}

function DropOverlay({ collectionName, maxLabel }: { collectionName: string; maxLabel: string }) {
  const t = useTranslations("documents");
  return (
    <div className="border-primary bg-primary/8 pointer-events-none absolute inset-3 z-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed backdrop-blur-[1px]">
      <div className="bg-card flex size-15 items-center justify-center rounded-2xl shadow-lg">
        <UploadCloud className="text-primary size-7" />
      </div>
      <p className="text-primary mt-4 text-lg font-semibold">
        {t("dropToUpload", { name: collectionName })}
      </p>
      <p className="text-primary/70 mt-1.5 font-mono text-xs">
        {t("formatHint")} · {t("sizeHint", { size: maxLabel })}
      </p>
    </div>
  );
}
