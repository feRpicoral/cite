import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const t = await getTranslations("common");
  const tAuth = await getTranslations("auth.login");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-semibold tracking-tight">{t("appName")}</h1>
        <p className="text-muted-foreground max-w-md text-sm text-balance">{t("tagline")}</p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">{t("create")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">{tAuth("submit")}</Link>
        </Button>
      </div>
    </main>
  );
}
