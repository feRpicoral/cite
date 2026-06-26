import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const t = await getTranslations("auth.login");

  return (
    <div className="space-y-4">
      <AuthCard title={t("title")} subtitle={t("subtitle")}>
        <LoginForm next={next} />
      </AuthCard>
      <p className="text-muted-foreground text-center text-sm">
        {t("noAccount")}{" "}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
