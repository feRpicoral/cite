import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

import { CiteLogo } from "./cite-logo";

export async function LegalNav({ locale, home }: { locale: Locale; home: string }) {
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-50 border-b backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-17 w-full max-w-6xl items-center px-6">
        <Link href={home} aria-label="Cite">
          <CiteLogo />
        </Link>
        <Link
          href={home}
          className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ChevronLeft className="size-4" />
          {t("backToSite")}
        </Link>
        <Button asChild size="sm" className="ml-4 hidden sm:inline-flex">
          <Link href="/signup">{t("createAccount")}</Link>
        </Button>
      </div>
    </header>
  );
}
