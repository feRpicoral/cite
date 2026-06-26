"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { forgotPasswordAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm({ onSent }: { onSent: (email?: string) => void }) {
  const t = useTranslations("auth.forgotPassword");
  const [state, formAction, pending] = useActionState(
    async (prev: ForgotPasswordState, formData: FormData) => {
      const result = await forgotPasswordAction(prev, formData);
      if (result.sent) onSent(result.email);
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          aria-invalid={state.error || undefined}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
