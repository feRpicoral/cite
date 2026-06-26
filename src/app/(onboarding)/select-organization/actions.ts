"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { setActiveOrg } from "@/lib/auth/active-org";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Result } from "@/lib/types/result";

const SwitchOrgSchema = z.object({ orgId: z.string().uuid() });

export async function switchOrgAction(input: z.infer<typeof SwitchOrgSchema>): Promise<Result> {
  const parsed = SwitchOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid organization." };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to switch workspaces." };

  // Only switch into an org the user actually belongs to — the active_org_id
  // feeds RLS, so an unchecked value would grant cross-tenant access.
  const membership = await getPrisma().membership.findUnique({
    where: { orgId_userId: { orgId: parsed.data.orgId, userId: user.id } },
  });
  if (!membership) return { ok: false, error: "You don't belong to that workspace." };

  await setActiveOrg(user.id, parsed.data.orgId);

  redirect("/dashboard");
}
