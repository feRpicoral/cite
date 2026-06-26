"use server";

import { z } from "zod";

import { appUrl } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

const ResendSchema = z.object({ email: z.string().email() });

export type ResendState = { resent?: boolean; error?: boolean };

export async function resendConfirmationAction(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const parsed = ResendSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: true };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: new URL("/auth/callback", appUrl()).toString(),
    },
  });
  if (error) return { error: true };

  return { resent: true };
}
