"use client";

import { Folder, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/cite/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { deleteCollectionAction } from "./actions";
import { CollectionDialog } from "./create-collection-form";

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  count: number;
}

type DialogState = { mode: "create" } | { mode: "edit"; target: CollectionSummary } | null;

export function CollectionsPane({
  collections,
  activeId,
}: {
  collections: CollectionSummary[];
  activeId: string | null;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<CollectionSummary | null>(null);
  const [pending, startTransition] = useTransition();

  function select(id: string) {
    router.push(`/documents?collection=${id}`);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set("id", deleteTarget.id);
    startTransition(async () => {
      await deleteCollectionAction(fd);
      toast.success(t("toast.collectionDeleted"));
      setDeleteTarget(null);
      router.push("/documents");
    });
  }

  return (
    <>
      <aside className="bg-background hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <span className="font-heading text-sm font-semibold">{t("collections")}</span>
          <Button
            variant="outline"
            size="icon-sm"
            className="ml-auto"
            aria-label={t("newCollection")}
            onClick={() => setDialog({ mode: "create" })}
          >
            <Plus />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0.5 p-2">
            {collections.map((c) => (
              <CollectionRow
                key={c.id}
                collection={c}
                active={c.id === activeId}
                onSelect={() => select(c.id)}
                onEdit={() => setDialog({ mode: "edit", target: c })}
                onDelete={() => setDeleteTarget(c)}
              />
            ))}
          </div>
        </ScrollArea>
      </aside>

      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b px-4 py-3 md:hidden">
        {collections.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => select(c.id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
              c.id === activeId
                ? "bg-primary/10 text-primary"
                : "bg-card text-muted-foreground border",
            )}
          >
            <span>{c.name}</span>
            <span className="font-mono text-[11px] opacity-70">{c.count}</span>
          </button>
        ))}
        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          aria-label={t("newCollection")}
          onClick={() => setDialog({ mode: "create" })}
        >
          <Plus />
        </Button>
      </div>

      <CollectionDialog
        key={dialog?.mode === "edit" ? `edit-${dialog.target.id}` : "create"}
        open={dialog !== null}
        onOpenChange={(next) => {
          if (!next) setDialog(null);
        }}
        edit={dialog?.mode === "edit" ? dialog.target : undefined}
        onSaved={(wasEdit) => {
          if (wasEdit) toast.success(t("toast.collectionUpdated"));
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
        destructive
        icon={<Trash2 />}
        title={deleteTarget ? t("deleteCollection.title", { name: deleteTarget.name }) : ""}
        description={
          deleteTarget
            ? t("deleteCollection.description", { count: deleteTarget.count })
            : undefined
        }
        confirmLabel={t("deleteCollection.confirm")}
        loading={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function CollectionRow({
  collection,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  collection: CollectionSummary;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("documents");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "group/row flex h-9 items-center gap-2 rounded-lg px-2.5 transition-colors",
        active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground/80",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <Folder className="size-4 shrink-0" />
        <span className="truncate text-sm font-medium">{collection.name}</span>
      </button>
      <span
        className={cn(
          "font-mono text-[11px] group-hover/row:hidden",
          menuOpen && "hidden",
          active ? "text-primary/70" : "text-muted-foreground",
        )}
      >
        {collection.count}
      </span>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("collectionActions.label")}
            className={cn("hidden group-hover/row:flex", menuOpen && "flex")}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            {t("collectionActions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            {t("collectionActions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
