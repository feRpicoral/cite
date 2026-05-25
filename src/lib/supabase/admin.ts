import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Secret-key client. Bypasses RLS. Use sparingly, only for trusted server paths
 * (tenant resolution at session start, signed Storage URLs, admin actions).
 * Never expose to the client.
 */
export function getServiceSupabase(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SECRET_KEY"),
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }
  return cached;
}
