import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

import { CiteLogo } from "./cite-logo";
import { LandingLanguageSelect } from "./landing-language-select";
import { MobileNav } from "./mobile-nav";

export async function MarketingNav({ locale, home }: { locale: Locale; home: string }) {
  const t = await getTranslations({ locale, namespace: "landing.nav" });

  const links = [
    { href: `${home}#product`, label: t("product") },
    { href: `${home}#how`, label: t("how") },
    { href: `${home}#usecases`, label: t("useCases") },
    { href: `${home}#faq`, label: t("faq") },
  ];

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-50 border-b backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-17 w-full max-w-6xl items-center px-6">
        <Link href={home} aria-label="Cite">
          <CiteLogo />
        </Link>

        <nav className="ml-10 hidden items-center gap-7 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-4 md:flex">
          <LandingLanguageSelect current={locale} />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">{t("createAccount")}</Link>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <LandingLanguageSelect current={locale} />
          <MobileNav
            menuLabel={t("menu")}
            links={links}
            signInLabel={t("signIn")}
            createLabel={t("createAccount")}
          />
        </div>
      </div>
    </header>
  );
}
