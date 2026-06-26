import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "../auth-card";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const t = await getTranslations("auth.signup");

  return (
    <div className="space-y-4">
      <AuthCard title={t("title")} subtitle={t("subtitle")}>
        <SignupForm />
      </AuthCard>
      <p className="text-muted-foreground text-center text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
