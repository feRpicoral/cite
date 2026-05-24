"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CollectionOption {
  id: string;
  name: string;
}

export function NewConversationButton({ collections }: { collections: CollectionOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collectionId, setCollectionId] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  const onCreate = () => {
    if (!collectionId) return;
    startTransition(async () => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      });
      if (!res.ok) {
        toast.error("Couldn't create conversation");
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
        <Button disabled={collections.length === 0}>
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>
            Pick the collection of documents you want to chat with.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Collection</Label>
          <Select value={collectionId} onValueChange={setCollectionId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a collection" />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={onCreate} disabled={!collectionId || pending}>
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
