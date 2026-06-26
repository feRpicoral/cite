"use client";

import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AuthCard } from "../auth-card";
import { BackLink } from "../back-link";
import { StatusCard } from "../status-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export function ForgotPasswordView() {
  const t = useTranslations("auth.forgotPassword");
  const tSent = useTranslations("auth.resetSent");
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo !== null) {
    return (
      <div className="space-y-4">
        <StatusCard
          icon={<MailCheck />}
          title={tSent("title")}
          description={
            sentTo
              ? tSent.rich("body", {
                  email: sentTo,
                  strong: (chunks) => (
                    <span className="text-foreground font-semibold">{chunks}</span>
                  ),
                })
              : tSent("bodyGeneric")
          }
        >
          <p className="text-muted-foreground text-xs">
            {tSent("spamHint")}{" "}
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="text-primary font-semibold hover:underline"
            >
              {tSent("tryAgain")}
            </button>
            .
          </p>
        </StatusCard>
        <div className="text-center">
          <BackLink href="/login">{tSent("backToSignIn")}</BackLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AuthCard title={t("title")} subtitle={t("subtitle")}>
        <ForgotPasswordForm onSent={(email) => setSentTo(email ?? "")} />
      </AuthCard>
      <div className="text-center">
        <BackLink href="/login">{t("backToSignIn")}</BackLink>
      </div>
    </div>
  );
}
