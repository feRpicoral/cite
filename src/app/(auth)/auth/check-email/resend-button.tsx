"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { resendConfirmationAction, type ResendState } from "./actions";

const initialState: ResendState = {};

export function ResendButton({ email }: { email: string }) {
  const t = useTranslations("auth.checkEmail");
  const [state, formAction, pending] = useActionState(resendConfirmationAction, initialState);

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="outline" className="w-full" disabled={pending || state.resent}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {state.resent && <Check className="text-success size-4" />}
        {state.resent ? t("resent") : pending ? t("resending") : t("resend")}
      </Button>
    </form>
  );
}
