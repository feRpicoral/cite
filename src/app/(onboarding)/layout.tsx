import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { resolveLocale } from "@/lib/i18n/resolve-locale";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </NextIntlClientProvider>
  );
}
