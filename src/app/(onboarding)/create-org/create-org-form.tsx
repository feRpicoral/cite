"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createOrgAction, type CreateOrgState } from "./actions";

const initialState: CreateOrgState = {};

export function CreateOrgForm() {
  const t = useTranslations("onboarding.createOrg");
  const [state, formAction, pending] = useActionState(createOrgAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input id="name" name="name" placeholder={t("namePlaceholder")} required />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
