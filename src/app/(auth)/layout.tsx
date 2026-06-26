import { Check, FileSearch, Highlighter } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

import { BrandMark } from "./brand-mark";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "auth.brandPanel" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-card hidden flex-col justify-center gap-8 border-r p-12 lg:flex xl:p-16">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-heading text-lg font-semibold tracking-tight">Cite</span>
          </Link>
          <div className="space-y-6">
            <span className="bg-background ring-border text-muted-foreground inline-flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase ring-1">
              <span className="bg-primary size-1.5 rounded-full" />
              {t("eyebrow")}
            </span>
            <h1 className="font-heading max-w-md text-4xl font-semibold tracking-tight text-balance xl:text-5xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground max-w-md leading-relaxed">{t("body")}</p>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-3 border-t pt-6 text-[13px] font-medium">
            <span className="flex items-center gap-2">
              <FileSearch className="text-primary size-4" />
              {t("featureCitations")}
            </span>
            <span className="flex items-center gap-2">
              <Highlighter className="text-warning size-4" />
              {t("featureHighlighting")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="text-success size-4" />
              {t("featureAuditing")}
            </span>
          </div>
        </div>
        <div className="relative flex flex-col">
          <header className="flex items-center justify-between gap-2 p-5">
            <Link href="/" className="flex items-center gap-2 lg:invisible">
              <BrandMark />
              <span className="font-heading font-semibold tracking-tight">Cite</span>
            </Link>
            <div className="flex items-center gap-1">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <div className="flex flex-1 items-center justify-center px-6 pb-16">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
