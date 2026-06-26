"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerSupabase } from "@/lib/supabase/server";

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8),
    confirm: z.string().min(1),
  })
  .refine((data) => data.password === data.confirm, { path: ["confirm"] });

export type ResetPasswordState = { error?: "mismatch" | "invalid" | "session" };

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  const parsed = ResetPasswordSchema.safeParse({ password, confirm });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.path[0] === "confirm");
    return { error: mismatch ? "mismatch" : "invalid" };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "session" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "invalid" };

  redirect("/dashboard");
}
