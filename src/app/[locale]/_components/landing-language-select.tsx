"use client";

import { ChevronDown, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Locale, locales, localeUrlSlug } from "@/i18n/config";
import { cn } from "@/lib/utils";

const SLUGS = Object.values(localeUrlSlug);
const LABELS: Record<Locale, string> = {
  "en-US": "English",
  "pt-BR": "Português",
};
const SHORT: Record<Locale, string> = {
  "en-US": "EN",
  "pt-BR": "PT",
};

function swapLocaleSlug(pathname: string, slug: string): string {
  const segments = pathname.split("/");
  const first = segments[1];
  if (first !== undefined && (SLUGS as string[]).includes(first)) {
    segments[1] = slug;
    return segments.join("/") || "/";
  }
  return `/${slug}`;
}

export function LandingLanguageSelect({
  current,
  className,
}: {
  current: Locale;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors outline-none",
          className,
        )}
      >
        <Globe className="size-4" />
        <span>{SHORT[current]}</span>
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem key={locale} asChild data-active={locale === current}>
            <Link href={swapLocaleSlug(pathname, localeUrlSlug[locale])}>{LABELS[locale]}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
