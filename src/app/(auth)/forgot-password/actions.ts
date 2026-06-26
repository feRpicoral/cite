"use server";

import { z } from "zod";

import { appUrl } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordState = { sent?: boolean; email?: string; error?: boolean };

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: true };

  const supabase = await createServerSupabase();
  // Land on /reset-password with a recovery session established by the
  // callback's code exchange. We don't surface whether the address exists,
  // so any non-validation outcome reports success.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: new URL("/auth/callback?next=/reset-password", appUrl()).toString(),
  });

  return { sent: true, email: parsed.data.email };
}
