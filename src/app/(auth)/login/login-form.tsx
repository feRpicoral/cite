"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FormAlert } from "../form-alert";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth.login");
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <FormAlert title={t("errorTitle")} body={t("errorBody")} />}
      <div className="space-y-2">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("passwordLabel")}</Label>
          <Link
            href="/forgot-password"
            className="text-primary text-xs font-semibold hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
