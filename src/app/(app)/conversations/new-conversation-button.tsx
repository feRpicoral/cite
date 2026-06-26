"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface DialogCollection {
  id: string;
  name: string;
  documentCount: number;
  indexedCount: number;
}

export function NewConversationButton({ collections }: { collections: DialogCollection[] }) {
  const t = useTranslations("conversationsList");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCreate = () => {
    if (!selected) return;
    startTransition(async () => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: selected }),
      });
      if (!res.ok) {
        toast.error(t("dialog.error"));
        return;
      }
      const data = (await res.json()) as { id: string };
      setOpen(false);
      router.push(`/conversations/${data.id}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-icon="inline-start" disabled={collections.length === 0}>
          <Plus />
          {t("newConversation")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" className="flex flex-col gap-1.5">
          {collections.map((c) => {
            const isSelected = c.id === selected;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "focus-visible:ring-ring/50 flex items-center gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3",
                  isSelected ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-primary" : "border-muted-foreground/40",
                  )}
                >
                  {isSelected && <span className="bg-primary size-2 rounded-full" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className="text-muted-foreground block text-xs">
                    {t("dialog.documentCount", { count: c.documentCount })} · {documentStatus(c, t)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button onClick={onCreate} disabled={!selected || pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t("dialog.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function documentStatus(
  c: DialogCollection,
  t: ReturnType<typeof useTranslations<"conversationsList">>,
): string {
  if (c.documentCount === 0) return t("dialog.empty");
  const pending = c.documentCount - c.indexedCount;
  if (pending > 0) return t("dialog.embedding", { count: pending });
  return t("dialog.indexed");
}
