"use client";

import { Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setUserThemeAction } from "@/components/theme-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { tabsListVariants } from "@/components/ui/tabs";
import { useMounted } from "@/hooks/use-mounted";
import { type Locale, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

import { setLocalePreferenceAction } from "./actions";

type ThemeChoice = "light" | "dark" | "system";
const themeChoices: ThemeChoice[] = ["light", "dark", "system"];
const themeIcon: Record<ThemeChoice, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: typeof Sun;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div
      className={cn(tabsListVariants(), "h-9 w-full sm:w-fit")}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            data-active={active || undefined}
            className={cn(
              "text-foreground/60 hover:text-foreground focus-visible:ring-ring/50 data-active:bg-background data-active:text-foreground dark:text-muted-foreground dark:hover:text-foreground dark:data-active:bg-input/30 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-active:shadow-sm sm:flex-none",
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function PreferencesForm({
  initialLocale,
  initialTheme,
}: {
  initialLocale: Locale;
  initialTheme: ThemeChoice;
}) {
  const router = useRouter();
  const t = useTranslations("settings.preferences");
  const tLocale = useTranslations("settings.preferences.localeOption");
  const tTheme = useTranslations("settings.preferences.themeOption");
  const tDirty = useTranslations("settings.dirty");
  const { setTheme } = useTheme();
  const mounted = useMounted();

  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [theme, setThemeChoice] = useState<ThemeChoice>(initialTheme);
  const [pending, startTransition] = useTransition();

  const dirty = locale !== initialLocale || theme !== initialTheme;

  function save() {
    startTransition(async () => {
      if (theme !== initialTheme) {
        setTheme(theme);
        await setUserThemeAction(
          theme === "dark" ? "DARK" : theme === "light" ? "LIGHT" : "SYSTEM",
        );
      }
      if (locale !== initialLocale) {
        const result = await setLocalePreferenceAction({ locale });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>{t("languageLabel")}</Label>
          <Segmented
            ariaLabel={t("languageLabel")}
            value={locale}
            disabled={pending}
            onChange={setLocale}
            options={locales.map((l) => ({ value: l, label: tLocale(l) }))}
          />
          <p className="text-muted-foreground text-xs">{t("languageHint")}</p>
        </div>

        <div className="space-y-2">
          <Label>{t("themeLabel")}</Label>
          <Segmented
            ariaLabel={t("themeLabel")}
            value={mounted ? theme : initialTheme}
            disabled={pending}
            onChange={setThemeChoice}
            options={themeChoices.map((c) => ({
              value: c,
              label: tTheme(c),
              icon: themeIcon[c],
            }))}
          />
        </div>

        <div className="border-border flex items-center gap-3 border-t pt-4">
          {dirty && (
            <span className="text-warning flex items-center gap-2 text-sm font-medium">
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {tDirty("label")}
            </span>
          )}
          <Button onClick={save} disabled={pending || !dirty} className="ml-auto">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
