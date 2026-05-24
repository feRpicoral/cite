import "server-only";

import { getServiceSupabase } from "@/lib/supabase/admin";

/**
 * Sets the active org id for a user in their Supabase `app_metadata`.
 * Persisted on the JWT — read by `getSession()` and available to RLS via
 * `auth.jwt() -> 'app_metadata' ->> 'active_org_id'`.
 */
export async function setActiveOrg(userId: string, orgId: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { data: existing } = await supabase.auth.admin.getUserById(userId);
  const previousMetadata = (existing.user?.app_metadata ?? {}) as Record<string, unknown>;
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { ...previousMetadata, active_org_id: orgId },
  });
  if (error) throw error;
}
