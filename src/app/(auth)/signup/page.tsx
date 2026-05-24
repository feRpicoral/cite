import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const t = await getTranslations("auth.signup");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
      <SignupForm />
      <p className="text-muted-foreground text-center text-sm">
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
