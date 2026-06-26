"use server";

import { type ThemePreference } from "@prisma/client";
import { z } from "zod";

import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

const ThemePreferenceSchema = z.enum(["LIGHT", "DARK", "SYSTEM"]);

/**
 * Persists the theme choice so it follows the user across devices. The toggle
 * updates next-themes localStorage directly; this keeps the DB in sync so the
 * next layout render doesn't let `ThemeSync` clobber the choice with a stale
 * value.
 */
export async function setUserThemeAction(preference: ThemePreference): Promise<void> {
  const parsed = ThemePreferenceSchema.safeParse(preference);
  if (!parsed.success) return;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await getPrisma().user.update({
    where: { id: user.id },
    data: { themePreference: parsed.data },
  });
}
