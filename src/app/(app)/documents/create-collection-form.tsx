"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createCollectionAction, type CreateCollectionState } from "./actions";

const initialState: CreateCollectionState = {};

export function CreateCollectionForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCollectionAction, initialState);

  if (state.error === undefined && pending === false && open) {
    // Close on a successful submission. State stays empty so this only fires
    // after a successful action, not on initial mount.
    // We don't need an effect — the dialog stays mounted, the form clears,
    // and the next render of the parent shows the new collection.
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Create collection">
          <Plus className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>
            Group documents that belong together — a contract set, a runbook, a knowledge base.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (fd) => {
            await formAction(fd);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Onboarding contracts" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" placeholder="What's in this collection?" />
          </div>
          {state.error && <p className="text-destructive text-sm">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
