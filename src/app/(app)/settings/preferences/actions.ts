"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { locales, toPrismaLocale } from "@/i18n/config";
import { requireSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { LOCALE_COOKIE } from "@/lib/i18n/resolve-locale";
import type { Result } from "@/lib/types/result";

const LocaleSchema = z.object({ locale: z.enum(locales) });

/**
 * Persist the user's UI locale to both layers:
 *   1. `NEXT_LOCALE` cookie so the next request hits the cookie tier with
 *      the matching value (before the DB lookup runs in the (app) layout).
 *   2. `User.locale` in Postgres so the choice survives logout / new devices.
 *
 * The DB write is unscoped because locale belongs to the user, not the org.
 */
export async function setLocalePreferenceAction(
  input: z.infer<typeof LocaleSchema>,
): Promise<Result> {
  const session = await requireSession();
  const parsed = LocaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid locale." };

  await getPrisma().user.update({
    where: { id: session.userId },
    data: { locale: toPrismaLocale(parsed.data.locale) },
  });

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
