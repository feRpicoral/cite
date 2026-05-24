import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const t = await getTranslations("auth.login");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
      <LoginForm next={next} />
      <p className="text-muted-foreground text-center text-sm">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
