import "server-only";

import type { MembershipRole } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cache } from "react";

import { getPrisma } from "@/lib/db/client";
import { asOrgId, asUserId, type OrgId, type UserId } from "@/lib/db/types";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Per-request memoized Supabase user read. Both the root layout (locale
 * resolution) and the (app) layout authenticate on every request; `cache`
 * collapses the duplicate `getUser()` round-trips into one per request.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export interface Session {
  userId: UserId;
  email: string;
  userName: string | null;
  orgId: OrgId;
  orgName: string;
  orgSlug: string;
  role: MembershipRole;
}

interface AuthState {
  userId: UserId | null;
  email: string | null;
  activeOrgId: OrgId | null;
}

async function getAuthState(): Promise<AuthState> {
  const user = await getAuthUser();
  if (!user) return { userId: null, email: null, activeOrgId: null };

  const activeOrgIdRaw =
    typeof user.app_metadata?.active_org_id === "string" ? user.app_metadata.active_org_id : null;

  return {
    userId: asUserId(user.id),
    email: user.email ?? null,
    activeOrgId: activeOrgIdRaw ? asOrgId(activeOrgIdRaw) : null,
  };
}

export async function getSession(): Promise<Session | null> {
  const { userId, email, activeOrgId } = await getAuthState();
  if (!userId || !email || !activeOrgId) return null;

  const membership = await getPrisma().membership.findUnique({
    where: { orgId_userId: { orgId: activeOrgId, userId } },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      user: { select: { name: true } },
    },
  });
  if (!membership) return null;

  return {
    userId,
    email,
    userName: membership.user.name,
    orgId: asOrgId(membership.organization.id),
    orgName: membership.organization.name,
    orgSlug: membership.organization.slug,
    role: membership.role,
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}

export async function requireSessionApi(): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

export async function requireAdminApi(): Promise<Session | NextResponse> {
  const result = await requireSessionApi();
  if (result instanceof NextResponse) return result;
  if (result.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return result;
}
