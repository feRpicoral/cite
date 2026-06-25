import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asOrgId, asUserId } from "@/lib/db/types";

const session = {
  userId: asUserId("11111111-1111-1111-1111-111111111111"),
  email: "admin@example.com",
  userName: "Admin",
  orgId: asOrgId("00000000-0000-0000-0000-000000000001"),
  orgName: "Org",
  orgSlug: "org",
  role: "ADMIN" as const,
};

const requireAdmin = vi.fn().mockResolvedValue(session);
const getServiceSupabase = vi.fn();
const getUser = vi.fn();

const prismaInvite = { findUnique: vi.fn() };
const prismaTransaction = vi.fn();
const dbInvite = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() };
const dbMembership = { findFirst: vi.fn() };

vi.mock("@/lib/auth/session", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/db/client", () => ({
  getPrisma: () => ({ invite: prismaInvite, $transaction: prismaTransaction }),
}));
vi.mock("@/lib/db/with-org", () => ({
  getDb: () => ({ invite: dbInvite, membership: dbMembership, $transaction: prismaTransaction }),
}));
vi.mock("@/lib/supabase/admin", () => ({ getServiceSupabase: () => getServiceSupabase() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getUser: () => getUser() } }),
}));
vi.mock("@/lib/env", () => ({ appUrl: () => "https://app.example" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  acceptInviteAction,
  changeRoleAction,
  createInviteAction,
  removeMemberAction,
} from "./actions";

function signedInAs(id: string, email: string) {
  getUser.mockResolvedValue({ data: { user: { id, email, app_metadata: {} } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue(session);
  getServiceSupabase.mockReturnValue({
    auth: { admin: { updateUserById: vi.fn().mockResolvedValue({}) } },
  });
});

describe("createInviteAction", () => {
  it("rejects an ADMIN invite with no email binding", async () => {
    const result = await createInviteAction({ role: "ADMIN" });

    expect(result).toEqual({ ok: false, error: expect.stringContaining("email") });
    expect(dbInvite.create).not.toHaveBeenCalled();
  });

  it("allows a MEMBER invite with no email", async () => {
    dbInvite.findFirst.mockResolvedValue(null);
    dbInvite.create.mockResolvedValue({ token: "tok" });

    const result = await createInviteAction({ role: "MEMBER" });

    expect(result.ok).toBe(true);
  });
});

describe("acceptInviteAction single-use", () => {
  const member = "22222222-2222-2222-2222-222222222222";

  it("rejects an already-accepted token for a new user", async () => {
    signedInAs(member, "new@example.com");
    prismaInvite.findUnique.mockResolvedValue({
      id: "i1",
      orgId: session.orgId,
      email: null,
      role: "MEMBER",
      expiresAt: new Date(Date.now() + 100_000),
      acceptedAt: new Date(),
    });
    prismaTransaction.mockImplementation(async (cb) => {
      const tx = {
        membership: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
        invite: { update: vi.fn() },
      };
      return cb(tx);
    });

    const result = await acceptInviteAction({ token: "a".repeat(32) });

    expect(result.ok).toBe(false);
  });

  it("accepts an already-accepted token for the existing member (idempotent)", async () => {
    signedInAs(member, "new@example.com");
    prismaInvite.findUnique.mockResolvedValue({
      id: "i1",
      orgId: session.orgId,
      email: null,
      role: "MEMBER",
      expiresAt: new Date(Date.now() + 100_000),
      acceptedAt: new Date(),
    });
    prismaTransaction.mockImplementation(async (cb) => {
      const tx = {
        membership: { findUnique: vi.fn().mockResolvedValue({ id: "m1" }), create: vi.fn() },
        invite: { update: vi.fn() },
      };
      return cb(tx);
    });

    const result = await acceptInviteAction({ token: "a".repeat(32) });

    expect(result).toEqual({ ok: true, orgId: session.orgId });
  });

  it("treats a concurrent P2002 on membership create as success", async () => {
    signedInAs(member, "new@example.com");
    prismaInvite.findUnique.mockResolvedValue({
      id: "i1",
      orgId: session.orgId,
      email: null,
      role: "MEMBER",
      expiresAt: new Date(Date.now() + 100_000),
      acceptedAt: null,
    });
    prismaTransaction.mockImplementation(async (cb) => {
      const tx = {
        membership: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("dup", {
              code: "P2002",
              clientVersion: "7",
            }),
          ),
        },
        invite: { update: vi.fn() },
      };
      return cb(tx);
    });

    const result = await acceptInviteAction({ token: "a".repeat(32) });

    expect(result).toEqual({ ok: true, orgId: session.orgId });
  });
});

describe("admin-count scoping", () => {
  it("scopes the last-admin count to the session org when demoting", async () => {
    const count = vi.fn().mockResolvedValue(2);
    prismaTransaction.mockImplementation(async (cb) => {
      const tx = {
        membership: {
          findUnique: vi.fn().mockResolvedValue({
            id: "m1",
            userId: asUserId("33333333-3333-3333-3333-333333333333"),
            role: "ADMIN",
          }),
          count,
          update: vi.fn(),
        },
      };
      return cb(tx);
    });

    await changeRoleAction({
      membershipId: "44444444-4444-4444-8444-444444444444",
      role: "MEMBER",
    });

    expect(count).toHaveBeenCalledWith({ where: { orgId: session.orgId, role: "ADMIN" } });
  });

  it("scopes the last-admin count to the session org when removing", async () => {
    const count = vi.fn().mockResolvedValue(2);
    prismaTransaction.mockImplementation(async (cb) => {
      const tx = {
        membership: {
          findUnique: vi.fn().mockResolvedValue({
            id: "m1",
            userId: asUserId("33333333-3333-3333-3333-333333333333"),
            role: "ADMIN",
          }),
          count,
          delete: vi.fn(),
        },
      };
      return cb(tx);
    });

    await removeMemberAction({ membershipId: "44444444-4444-4444-8444-444444444444" });

    expect(count).toHaveBeenCalledWith({ where: { orgId: session.orgId, role: "ADMIN" } });
  });
});
