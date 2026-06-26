import type { Metadata } from "next";
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
    ? await getTranslations({ locale, namespace: "legal.privacy" })
    : await getTranslations("legal.privacy");
  return { title: t("title") };
}

export default async function PrivacyPage({ params }: PageProps) {
  const locale = slugToLocale((await params).locale);
  if (!locale) notFound();
  setRequestLocale(locale);
  const home = `/${localeUrlSlug[locale]}`;
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  return (
    <LegalLayout
      locale={locale}
      home={home}
      title={t("title")}
      crossLink={t("crossLink")}
      crossHref={`${home}/terms`}
      intro={t("intro")}
    >
      <LegalSection title={t("s1Title")}>{t("s1Body")}</LegalSection>
      <LegalSection title={t("s2Title")}>{t("s2Body")}</LegalSection>
      <LegalSection title={t("s3Title")}>{t("s3Body")}</LegalSection>
      <LegalSection title={t("s4Title")}>{t("s4Body")}</LegalSection>
      <LegalSection id="security" title={t("s5Title")}>
        {t("s5Body")}
      </LegalSection>
      <LegalSection title={t("s6Title")}>{t("s6Body")}</LegalSection>
      <LegalSection title={t("s7Title")}>{t("s7Body")}</LegalSection>
      <LegalSection title={t("s8Title")}>{t("s8Body")}</LegalSection>
      <LegalSection title={t("s9Title")}>
        {t("s9BodyLead")}{" "}
        <a href={`mailto:${t("contactEmail")}`} className="text-foreground font-semibold">
          {t("contactEmail")}
        </a>
        .
      </LegalSection>
    </LegalLayout>
  );
}
