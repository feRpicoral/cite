"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/safe-redirect";
import { createServerSupabase } from "@/lib/supabase/server";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type LoginState = { error?: boolean };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: true };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: true };

  redirect(safeNextPath(parsed.data.next, "/dashboard"));
}
