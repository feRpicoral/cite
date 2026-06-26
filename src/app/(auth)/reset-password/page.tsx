import { Clock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { createServerSupabase } from "@/lib/supabase/server";

import { AuthCard } from "../auth-card";
import { BackLink } from "../back-link";
import { StatusCard } from "../status-card";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.setPassword");

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-4">
        <StatusCard
          icon={<Clock />}
          tone="warning"
          title={t("expiredTitle")}
          description={t("expiredBody")}
        >
          <Button asChild className="w-full">
            <Link href="/forgot-password">{t("requestNew")}</Link>
          </Button>
        </StatusCard>
        <div className="text-center">
          <BackLink href="/login">{t("backToSignIn")}</BackLink>
        </div>
      </div>
    );
  }

  return (
    <AuthCard title={t("title")}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
