"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signupAction, type SignupState } from "./actions";

const initialState: SignupState = {};

export function SignupForm() {
  const t = useTranslations("auth.signup");
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
