import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";

import { CiteLogo } from "./cite-logo";
import { LandingLanguageSelect } from "./landing-language-select";

export async function MarketingFooter({ locale, home }: { locale: Locale; home: string }) {
  const t = await getTranslations({ locale, namespace: "landing.footer" });

  const product = [
    { href: `${home}#product`, label: t("features") },
    { href: `${home}#how`, label: t("how") },
    { href: `${home}#usecases`, label: t("useCases") },
    { href: "/signup", label: t("createAccount") },
  ];

  const legal = [
    { href: `${home}/terms`, label: t("terms") },
    { href: `${home}/privacy`, label: t("privacy") },
    { href: `${home}/privacy#security`, label: t("security") },
  ];

  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-12 px-6 pt-14 pb-10">
        <div className="flex-1 basis-72">
          <Link href={home} aria-label="Cite">
            <CiteLogo />
          </Link>
          <p className="text-muted-foreground mt-3.5 max-w-64 text-sm leading-relaxed">
            {t("tagline")}
          </p>
          <div className="mt-4">
            <LandingLanguageSelect
              current={locale}
              className="bg-card hover:text-foreground h-8 rounded-lg border px-3"
            />
          </div>
        </div>

        <FooterColumn heading={t("productHeading")} links={product} />
        <FooterColumn heading={t("legalHeading")} links={legal} />
      </div>
      <div className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 py-5 text-xs">
          <span>{t("rights")}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="flex-1 basis-36">
      <div className="text-muted-foreground mb-3.5 font-mono text-[11px] font-semibold tracking-wider uppercase">
        {heading}
      </div>
      <div className="flex flex-col gap-2.5">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
