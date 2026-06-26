import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { localeUrlSlug, slugToLocale } from "@/i18n/config";

import { LegalLayout, LegalSection } from "../_components/legal-layout";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = slugToLocale((await params).locale);
  const t = locale
    ? await getTranslations({ locale, namespace: "legal.terms" })
    : await getTranslations("legal.terms");
  return { title: t("title") };
}

export default async function TermsPage({ params }: PageProps) {
  const locale = slugToLocale((await params).locale);
  if (!locale) notFound();
  setRequestLocale(locale);
  const home = `/${localeUrlSlug[locale]}`;
  const t = await getTranslations({ locale, namespace: "legal.terms" });

  return (
    <LegalLayout
      locale={locale}
      home={home}
      title={t("title")}
      crossLink={t("crossLink")}
      crossHref={`${home}/privacy`}
      intro={t("intro")}
    >
      <LegalSection title={t("s1Title")}>{t("s1Body")}</LegalSection>
      <LegalSection title={t("s2Title")}>{t("s2Body")}</LegalSection>
      <LegalSection title={t("s3Title")}>{t("s3Body")}</LegalSection>
      <LegalSection title={t("s4Title")}>{t("s4Body")}</LegalSection>
      <LegalSection title={t("s5Title")}>{t("s5Body")}</LegalSection>
      <LegalSection title={t("s6Title")}>{t("s6Body")}</LegalSection>
      <LegalSection title={t("s7Title")}>
        {t("s7BodyLead")}{" "}
        <Link href={`${home}/privacy`} className="text-primary font-semibold">
          {t("s7Link")}
        </Link>
        {t("s7BodyTail")}
      </LegalSection>
      <LegalSection title={t("s8Title")}>{t("s8Body")}</LegalSection>
      <LegalSection title={t("s9Title")}>{t("s9Body")}</LegalSection>
      <LegalSection title={t("s10Title")}>{t("s10Body")}</LegalSection>
      <LegalSection title={t("s11Title")}>{t("s11Body")}</LegalSection>
      <LegalSection title={t("s12Title")}>
        {t("s12BodyLead")}{" "}
        <a href={`mailto:${t("contactEmail")}`} className="text-foreground font-semibold">
          {t("contactEmail")}
        </a>
        .
      </LegalSection>
    </LegalLayout>
  );
}
