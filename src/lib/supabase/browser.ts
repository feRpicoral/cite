"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (cached) return cached;
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  );

  // Forward the user's JWT to the Realtime client on session restore. The
  // SupabaseClient's internal token handler only forwards SIGNED_IN and
  // TOKEN_REFRESHED to `realtime.setAuth` — INITIAL_SESSION (emitted when a
  // cookie-backed session restores on page load) is ignored. Without this,
  // channels subscribed before a fresh sign-in negotiate the WebSocket with
  // just the publishable key and RLS rejects every postgres_changes payload.
  client.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION" && session?.access_token) {
      void client.realtime.setAuth(session.access_token);
    }
  });

  cached = client;
  return cached;
}
