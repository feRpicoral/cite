import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionApi = vi.fn();
const getDb = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSessionApi: () => requireSessionApi() }));
vi.mock("@/lib/db/with-org", () => ({ getDb: (orgId: string) => getDb(orgId) }));

import { PATCH } from "./route";

const VALID_ID = "22222222-2222-4222-8222-222222222222";
const CREATOR = "user-creator";
const OTHER = "user-other";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://test", { method: "PATCH", body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/conversations/[id]", () => {
  it("rejects a non-uuid id with 400 before touching the db", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: CREATOR, role: "MEMBER" });

    const res = await PATCH(patchRequest({ title: "New" }), context("not-a-uuid"));

    expect(res.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects an empty title with 400", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: CREATOR, role: "MEMBER" });

    const res = await PATCH(patchRequest({ title: "  " }), context(VALID_ID));

    expect(res.status).toBe(400);
  });

  it("returns 404 when the conversation is absent", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: CREATOR, role: "MEMBER" });
    const update = vi.fn();
    getDb.mockReturnValue({
      conversation: { findUnique: vi.fn().mockResolvedValue(null), update },
    });

    const res = await PATCH(patchRequest({ title: "New" }), context(VALID_ID));

    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("forbids a non-creator non-admin member", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: OTHER, role: "MEMBER" });
    const update = vi.fn();
    getDb.mockReturnValue({
      conversation: { findUnique: vi.fn().mockResolvedValue({ createdByUserId: CREATOR }), update },
    });

    const res = await PATCH(patchRequest({ title: "New" }), context(VALID_ID));

    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows an admin to rename another member's conversation", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: OTHER, role: "ADMIN" });
    const update = vi.fn().mockResolvedValue({ id: VALID_ID, title: "New", updatedAt: new Date() });
    getDb.mockReturnValue({
      conversation: { findUnique: vi.fn().mockResolvedValue({ createdByUserId: CREATOR }), update },
    });

    const res = await PATCH(patchRequest({ title: "New" }), context(VALID_ID));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledOnce();
  });

  it("allows the creator to rename their own conversation", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: CREATOR, role: "MEMBER" });
    const update = vi.fn().mockResolvedValue({ id: VALID_ID, title: "New", updatedAt: new Date() });
    getDb.mockReturnValue({
      conversation: { findUnique: vi.fn().mockResolvedValue({ createdByUserId: CREATOR }), update },
    });

    const res = await PATCH(patchRequest({ title: "New" }), context(VALID_ID));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: VALID_ID },
      data: { title: "New" },
      select: { id: true, title: true, updatedAt: true },
    });
  });
});
