"use client";

import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadDocument } from "@/lib/upload-document";

const ACCEPT =
  ".pdf,.docx,.html,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,text/markdown";

export function DocumentUpload({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const t = useTranslations();

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file, collectionId);
      toast.success(`Uploaded ${file.name}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onChange} />
      <Button onClick={onPick} disabled={uploading}>
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="h-4 w-4" />
        )}
        {uploading ? t("common.loading") : t("app.dashboard.uploadCta")}
      </Button>
    </>
  );
}
