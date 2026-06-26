import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const membershipFindUnique = vi.fn();
const setActiveOrg = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock("@/lib/db/client", () => ({
  getPrisma: () => ({ membership: { findUnique: membershipFindUnique } }),
}));
vi.mock("@/lib/auth/active-org", () => ({
  setActiveOrg: (...args: unknown[]) => setActiveOrg(...args),
}));

class RedirectError extends Error {
  constructor(public target: string) {
    super("REDIRECT");
  }
}
vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    throw new RedirectError(target);
  },
}));

import { switchOrgAction } from "./actions";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const ORG_ID = "22222222-2222-4222-a222-222222222222";

function signedIn() {
  getUser.mockResolvedValue({ data: { user: { id: USER_ID, app_metadata: {} } } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("switchOrgAction", () => {
  it("rejects a non-uuid org id without touching the session", async () => {
    signedIn();

    const result = await switchOrgAction({ orgId: "not-a-uuid" });

    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(setActiveOrg).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const result = await switchOrgAction({ orgId: ORG_ID });

    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(setActiveOrg).not.toHaveBeenCalled();
  });

  it("refuses to switch into an org the user does not belong to", async () => {
    signedIn();
    membershipFindUnique.mockResolvedValue(null);

    const result = await switchOrgAction({ orgId: ORG_ID });

    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(setActiveOrg).not.toHaveBeenCalled();
  });

  it("sets the active org and redirects to the dashboard for a member", async () => {
    signedIn();
    membershipFindUnique.mockResolvedValue({ orgId: ORG_ID, userId: USER_ID, role: "MEMBER" });

    await expect(switchOrgAction({ orgId: ORG_ID })).rejects.toMatchObject({
      target: "/dashboard",
    });
    expect(setActiveOrg).toHaveBeenCalledWith(USER_ID, ORG_ID);
  });
});
