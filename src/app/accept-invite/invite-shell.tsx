import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

import { BrandMark } from "../(auth)/brand-mark";

export async function InviteShell({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-2 p-5">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark />
            <span className="font-heading font-semibold tracking-tight">Cite</span>
          </Link>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
