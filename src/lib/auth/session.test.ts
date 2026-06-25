import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const membershipFindUnique = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock("@/lib/db/client", () => ({
  getPrisma: () => ({ membership: { findUnique: () => membershipFindUnique() } }),
}));

import { requireAdminApi, requireSessionApi } from "./session";

const orgId = "00000000-0000-0000-0000-000000000001";

function signedIn(role: "ADMIN" | "MEMBER") {
  getUser.mockResolvedValue({
    data: {
      user: { id: "user-1", email: "u@example.com", app_metadata: { active_org_id: orgId } },
    },
  });
  membershipFindUnique.mockResolvedValue({
    role,
    organization: { id: orgId, name: "Org", slug: "org" },
    user: { name: "U" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireSessionApi", () => {
  it("returns the session when authenticated", async () => {
    signedIn("MEMBER");

    const result = await requireSessionApi();

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { orgId: string }).orgId).toBe(orgId);
  });

  it("returns a 401 response when there is no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const result = await requireSessionApi();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});

describe("requireAdminApi", () => {
  it("returns a 403 response for a non-admin", async () => {
    signedIn("MEMBER");

    const result = await requireAdminApi();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("returns the session for an admin", async () => {
    signedIn("ADMIN");

    const result = await requireAdminApi();

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { role: string }).role).toBe("ADMIN");
  });
});
