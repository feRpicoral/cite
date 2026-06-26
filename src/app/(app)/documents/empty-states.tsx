"use client";

import { FolderPlus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "@/components/cite/empty-state";
import { Button } from "@/components/ui/button";

import { CollectionDialog } from "./create-collection-form";

export function NoCollections() {
  const t = useTranslations("documents");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        tone="primary"
        icon={<FolderPlus />}
        title={t("empty.noCollectionsTitle")}
        description={t("empty.noCollectionsBody")}
      >
        <Button onClick={() => setOpen(true)}>
          <Plus />
          {t("newCollection")}
        </Button>
      </EmptyState>
      <CollectionDialog open={open} onOpenChange={setOpen} onSaved={() => router.refresh()} />
    </div>
  );
}
