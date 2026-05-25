"use server";

import { type ThemePreference } from "@prisma/client";

import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Persists the user's theme choice to the DB so it follows them across
 * devices. Local UI state (next-themes localStorage) is updated by the
 * toggle directly; this just makes sure the layout server component
 * reads back the same value on the next render — otherwise `ThemeSync`
 * would clobber the user's choice with the stale DB value.
 */
export async function setUserThemeAction(preference: ThemePreference): Promise<void> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await getPrisma().user.update({
    where: { id: user.id },
    data: { themePreference: preference },
  });
}
