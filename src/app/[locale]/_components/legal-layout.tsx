import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";

import { LegalNav } from "./legal-nav";
import { MarketingFooter } from "./marketing-footer";

export async function LegalLayout({
  locale,
  home,
  title,
  crossLink,
  crossHref,
  intro,
  children,
}: {
  locale: Locale;
  home: string;
  title: string;
  crossLink: string;
  crossHref: string;
  intro: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <div className="bg-background text-foreground min-h-screen">
      <LegalNav locale={locale} home={home} />
      <article className="mx-auto max-w-3xl px-6 pt-16">
        <div className="text-primary font-mono text-[11px] font-semibold tracking-widest uppercase">
          {t("eyebrow")}
        </div>
        <h1 className="mt-3.5 text-[clamp(2.125rem,5vw,3rem)] leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3.5">
          <span className="text-muted-foreground font-mono text-xs font-medium">
            {t("lastUpdated")}
          </span>
          <span className="bg-muted-foreground/40 size-1 rounded-full" />
          <Link href={crossHref} className="text-primary text-xs font-semibold">
            {crossLink}
          </Link>
        </div>
        <p className="text-muted-foreground mt-6 text-base leading-relaxed">{intro}</p>

        <div className="mt-10 flex flex-col gap-8 pb-4">{children}</div>
      </article>
      <MarketingFooter locale={locale} home={home} />
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-20" : undefined}>
      <h2 className="text-xl leading-snug font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">{children}</p>
    </section>
  );
}
