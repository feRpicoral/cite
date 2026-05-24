import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS. Use sparingly, only for trusted server paths
 * (tenant resolution at session start, signed Storage URLs, admin actions).
 * Never expose to the client.
 */
export function getServiceSupabase(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }
  return cached;
}
