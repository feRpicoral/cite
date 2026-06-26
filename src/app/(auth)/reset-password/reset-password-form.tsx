"use client";

import { Check, CircleAlert, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { resetPasswordAction, type ResetPasswordState } from "./actions";

const MIN_PASSWORD_LENGTH = 8;
const initialState: ResetPasswordState = {};

export function ResetPasswordForm() {
  const t = useTranslations("auth.setPassword");
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const strongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const showStrength = password.length > 0;
  const showMismatch = state.error === "mismatch" || (confirm.length > 0 && password !== confirm);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {showStrength && (
          <p
            className={
              strongEnough
                ? "text-success flex items-center gap-1.5 text-xs"
                : "text-muted-foreground flex items-center gap-1.5 text-xs"
            }
          >
            {strongEnough ? (
              <Check className="size-3.5" strokeWidth={2.6} />
            ) : (
              <CircleAlert className="size-3.5" strokeWidth={2.4} />
            )}
            {strongEnough ? t("strong", { count: password.length }) : t("passwordHint")}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t("confirmLabel")}</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={showMismatch || undefined}
          aria-describedby={showMismatch ? "confirm-error" : undefined}
        />
        {showMismatch && (
          <p id="confirm-error" className="text-destructive flex items-center gap-1.5 text-xs">
            <CircleAlert className="size-3.5" strokeWidth={2.4} />
            {t("mismatch")}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={pending || !strongEnough || password !== confirm}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
