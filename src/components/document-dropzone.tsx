"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { uploadDocument } from "@/lib/upload-document";

interface DocumentDropzoneProps {
  collectionId: string;
  children: React.ReactNode;
}

/**
 * Wraps a region so dropping files anywhere inside it uploads them to the
 * collection. The drag-leave logic uses a ref-counted entry/leave because
 * dragenter/leave fire on every descendant, not just the wrapper — without
 * counting, dragging across a child would prematurely clear the active
 * state.
 */
export function DocumentDropzone({ collectionId, children }: DocumentDropzoneProps) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const counterRef = useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    counterRef.current += 1;
    setActive(true);
  }, []);

  const onDragLeave = useCallback(() => {
    counterRef.current = Math.max(counterRef.current - 1, 0);
    if (counterRef.current === 0) setActive(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setActive(false);
      counterRef.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Serial uploads — the API expects one file per request and we want
      // a separate toast per file rather than a single all-or-nothing.
      for (const file of files) {
        try {
          await uploadDocument(file, collectionId);
          toast.success(`Uploaded ${file.name}`);
        } catch (err) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : "failed"}`);
        }
      }
      router.refresh();
    },
    [collectionId, router],
  );

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="relative flex flex-1 flex-col"
    >
      {children}
      {active && (
        <div className="bg-primary/5 border-primary pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-primary flex items-center gap-2 text-sm font-medium">
            <UploadCloud className="h-5 w-5" />
            Drop to upload
          </div>
        </div>
      )}
    </div>
  );
}
