"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { type Locale, locales, toPrismaLocale } from "@/i18n/config";
import { getPrisma } from "@/lib/db/client";
import { LOCALE_COOKIE } from "@/lib/i18n/resolve-locale";
import { createServerSupabase } from "@/lib/supabase/server";

const LocaleSchema = z.enum(locales);

/**
 * Persists the locale on both layers: the cookie is read by the proxy and
 * next-intl resolver on every request so the change applies before the DB
 * write lands, while User.locale survives logout and new devices.
 */
export async function setUserLocaleAction(locale: Locale): Promise<void> {
  const parsed = LocaleSchema.safeParse(locale);
  if (!parsed.success) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, parsed.data, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await getPrisma().user.update({
    where: { id: user.id },
    data: { locale: toPrismaLocale(parsed.data) },
  });
}
