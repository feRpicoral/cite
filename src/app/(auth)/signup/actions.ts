"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerSupabase } from "@/lib/supabase/server";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type SignupState = { error?: string };

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  redirect("/auth/check-email");
}
