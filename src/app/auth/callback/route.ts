import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/safe-redirect";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), "/dashboard");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
