import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireEnv } from "@/lib/env";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore if the proxy
            // is refreshing sessions.
          }
        },
      },
    },
  );
}
