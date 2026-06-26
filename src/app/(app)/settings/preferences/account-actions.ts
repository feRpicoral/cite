"use server";

import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Result } from "@/lib/types/result";

const NameSchema = z.object({ name: z.string().trim().min(1).max(80) });

/**
 * Updates the display name via Supabase user metadata; the handle_auth_user
 * trigger mirrors it into public.users.name, keeping both layers consistent.
 */
export async function updateNameAction(input: z.infer<typeof NameSchema>): Promise<Result> {
  await requireSession();
  const parsed = NameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter your name." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ data: { name: parsed.data.name } });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const EmailSchema = z.object({ email: z.string().email() });

export async function updateEmailAction(input: z.infer<typeof EmailSchema>): Promise<Result> {
  await requireSession();
  const parsed = EmailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };

  // Supabase sends a confirmation link; the address only changes once confirmed.
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const PasswordSchema = z.object({ password: z.string().min(8) });

export async function updatePasswordAction(input: z.infer<typeof PasswordSchema>): Promise<Result> {
  await requireSession();
  const parsed = PasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Password must be at least 8 characters." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
