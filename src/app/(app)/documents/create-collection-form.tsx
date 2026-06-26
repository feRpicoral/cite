"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createCollectionAction,
  type CreateCollectionState,
  updateCollectionAction,
  type UpdateCollectionState,
} from "./actions";

const NAME_MAX = 80;
const DESCRIPTION_MAX = 280;

type EditTarget = { id: string; name: string; description: string | null };

const initialState: CreateCollectionState & UpdateCollectionState = {};

export function CollectionDialog({
  open,
  onOpenChange,
  onSaved,
  edit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (wasEdit: boolean) => void;
  edit?: EditTarget;
}) {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const action = edit ? updateCollectionAction : createCollectionAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [name, setName] = useState(edit?.name ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");

  // The action result lands in `state` asynchronously, so closing on the
  // pending->idle transition lets us read the final validation error first.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      onOpenChange(false);
      onSaved?.(edit !== undefined);
    }
    wasPending.current = pending;
  }, [pending, state, onOpenChange, onSaved, edit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? t("editCollection") : t("newCollection")}</DialogTitle>
          <DialogDescription>{t("form.descriptionHint")}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {edit && <input type="hidden" name="id" value={edit.id} />}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="collection-name">{t("form.name")}</Label>
              <span className="text-muted-foreground font-mono text-[10px]">
                {t("form.charCount", { count: name.length, max: NAME_MAX })}
              </span>
            </div>
            <Input
              id="collection-name"
              name="name"
              autoFocus
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="collection-description">
                {t("form.description")}{" "}
                <span className="text-muted-foreground font-normal">
                  {t("form.descriptionOptional")}
                </span>
              </Label>
              <span className="text-muted-foreground font-mono text-[10px]">
                {t("form.charCount", { count: description.length, max: DESCRIPTION_MAX })}
              </span>
            </div>
            <textarea
              id="collection-description"
              name="description"
              rows={3}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 aria-invalid:border-destructive w-full resize-none rounded-lg border bg-transparent px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-3"
            />
          </div>
          {state.error && <p className="text-destructive text-sm">{state.error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-cite-spin" />}
              {edit ? tCommon("save") : t("createCollection")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
