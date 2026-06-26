"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FormAlert } from "../form-alert";
import { signupAction, type SignupState } from "./actions";

const MIN_PASSWORD_LENGTH = 8;
const initialState: SignupState = {};

export function SignupForm() {
  const t = useTranslations("auth.signup");
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const showHint = touched && tooShort;

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <FormAlert title={state.error} />}
      <div className="space-y-2">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
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
          onBlur={() => setTouched(true)}
          aria-invalid={showHint || undefined}
          aria-describedby={showHint ? "password-hint" : undefined}
        />
        {showHint && (
          <p id="password-hint" className="text-destructive flex items-center gap-1.5 text-xs">
            <CircleAlert className="size-3.5" strokeWidth={2.4} />
            {t("passwordHint")}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
