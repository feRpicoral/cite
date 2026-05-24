"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Locale, locales } from "@/i18n/config";

import { setUserLocaleAction } from "./locale-actions";

const LABELS: Record<Locale, string> = {
  "en-US": "English",
  "pt-BR": "Português",
};

export function LocaleSwitcher() {
  const current = useLocale() as Locale;
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  const select = (locale: Locale) => {
    if (locale === current) return;
    startTransition(async () => {
      await setUserLocaleAction(locale);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("language")} disabled={pending}>
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => select(locale)}
            data-active={locale === current}
          >
            {LABELS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
