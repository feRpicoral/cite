"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateOrgNameAction } from "./members/actions";

interface OrgFormProps {
  initialName: string;
  slug: string;
  roleLabel: string;
}

export function OrgForm({ initialName, slug, roleLabel }: OrgFormProps) {
  const router = useRouter();
  const t = useTranslations("settings.organization");
  const tDirty = useTranslations("settings.dirty");
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();

  const trimmed = name.trim();
  const dirty = trimmed !== initialName;

  function save() {
    if (!trimmed) {
      toast.error(t("nameRequired"));
      return;
    }
    startTransition(async () => {
      const result = await updateOrgNameAction({ name: trimmed });
      if (result.ok) {
        toast.success(t("saved"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="org-name">{t("nameLabel")}</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            maxLength={120}
            className="max-w-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-slug">{t("slugLabel")}</Label>
          <div className="border-input flex max-w-sm items-center overflow-hidden rounded-lg border">
            <span className="text-muted-foreground bg-muted border-input border-r px-3 py-1.5 font-mono text-sm">
              cite.app/
            </span>
            <span className="px-3 py-1.5 text-sm">{slug}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("roleLabel")}</Label>
          <div className="flex items-center gap-2.5">
            <Badge>{roleLabel}</Badge>
            <span className="text-muted-foreground text-sm">{t("adminHint")}</span>
          </div>
        </div>

        {dirty && (
          <div className="border-border flex items-center gap-3 border-t pt-4">
            <span className="text-warning flex items-center gap-2 text-sm font-medium">
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {tDirty("label")}
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => setName(initialName)} disabled={pending}>
                {tDirty("cancel")}
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                {tDirty("save")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
