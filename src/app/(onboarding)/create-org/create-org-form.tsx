"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/slug";

import { createOrgAction, type CreateOrgState } from "./actions";

const MAX_NAME_LENGTH = 80;
const initialState: CreateOrgState = {};

export function CreateOrgForm() {
  const t = useTranslations("onboarding.createOrg");
  const [state, formAction, pending] = useActionState(createOrgAction, initialState);
  const [name, setName] = useState("");

  const slug = slugify(name);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t("namePlaceholder")}
          required
          autoFocus
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={state.error ? true : undefined}
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground truncate">
            {t("urlLabel")}{" "}
            <span className="text-primary font-mono">cite.app/{slug || "your-org"}</span>
          </span>
          <span className="text-muted-foreground shrink-0 font-mono tabular-nums">
            {name.length} / {MAX_NAME_LENGTH}
          </span>
        </div>
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
