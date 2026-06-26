"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Result } from "@/lib/types/result";

import { updateEmailAction, updateNameAction, updatePasswordAction } from "./account-actions";

const MIN_PASSWORD = 8;

export function AccountForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const t = useTranslations("settings.account");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  const nameTrimmed = name.trim();
  const emailTrimmed = email.trim();

  function run(fn: () => Promise<Result>, success: string, after?: () => void) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        after?.();
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
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="account-name">{t("nameLabel")}</Label>
          <div className="flex max-w-sm gap-2">
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              maxLength={80}
            />
            <Button
              variant="outline"
              disabled={pending || !nameTrimmed || nameTrimmed === initialName}
              onClick={() => run(() => updateNameAction({ name: nameTrimmed }), t("nameSaved"))}
            >
              {t("save")}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-email">{t("emailLabel")}</Label>
          <div className="flex max-w-sm gap-2">
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
            <Button
              variant="outline"
              disabled={pending || !emailTrimmed || emailTrimmed === initialEmail}
              onClick={() => run(() => updateEmailAction({ email: emailTrimmed }), t("emailSaved"))}
            >
              {t("save")}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">{t("emailHint")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-password">{t("passwordLabel")}</Label>
          <div className="flex max-w-sm flex-col gap-2">
            <Input
              id="account-password"
              type="password"
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
            <Input
              id="account-password-confirm"
              type="password"
              autoComplete="new-password"
              placeholder={t("passwordConfirmPlaceholder")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={pending}
            />
            <Button
              variant="outline"
              className="self-start"
              disabled={pending || password.length < MIN_PASSWORD || password !== confirm}
              onClick={() =>
                run(
                  () => updatePasswordAction({ password }),
                  t("passwordSaved"),
                  () => {
                    setPassword("");
                    setConfirm("");
                  },
                )
              }
            >
              {t("save")}
            </Button>
          </div>
          {password.length > 0 && password.length < MIN_PASSWORD && (
            <p className="text-destructive text-xs">{t("passwordTooShort")}</p>
          )}
          {confirm.length > 0 && password !== confirm && (
            <p className="text-destructive text-xs">{t("passwordMismatch")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
