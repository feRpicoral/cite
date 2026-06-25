import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionApi = vi.fn();
const getDb = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSessionApi: () => requireSessionApi() }));
vi.mock("@/lib/db/with-org", () => ({ getDb: (orgId: string) => getDb(orgId) }));

import { DELETE, PATCH } from "./route";

const VALID_ID = "22222222-2222-4222-8222-222222222222";
const AUTHOR = "user-author";
const OTHER = "user-other";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(resolved: boolean) {
  return new Request("http://test", {
    method: "PATCH",
    body: JSON.stringify({ resolved }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/comments/[id]", () => {
  it("rejects a non-uuid id with 400 before touching the db", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: AUTHOR, role: "MEMBER" });

    const res = await PATCH(patchRequest(true), context("not-a-uuid"));

    expect(res.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 when the comment is absent", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: AUTHOR, role: "MEMBER" });
    const findUnique = vi.fn().mockResolvedValue(null);
    const update = vi.fn();
    getDb.mockReturnValue({ comment: { findUnique, update } });

    const res = await PATCH(patchRequest(true), context(VALID_ID));

    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("forbids a non-author non-admin member", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: OTHER, role: "MEMBER" });
    const findUnique = vi.fn().mockResolvedValue({ authorUserId: AUTHOR });
    const update = vi.fn();
    getDb.mockReturnValue({ comment: { findUnique, update } });

    const res = await PATCH(patchRequest(true), context(VALID_ID));

    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows an admin to resolve another member's comment", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: OTHER, role: "ADMIN" });
    const findUnique = vi.fn().mockResolvedValue({ authorUserId: AUTHOR });
    const update = vi.fn().mockResolvedValue({});
    getDb.mockReturnValue({ comment: { findUnique, update } });

    const res = await PATCH(patchRequest(true), context(VALID_ID));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledOnce();
  });

  it("allows the author to resolve their own comment", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: AUTHOR, role: "MEMBER" });
    const findUnique = vi.fn().mockResolvedValue({ authorUserId: AUTHOR });
    const update = vi.fn().mockResolvedValue({});
    getDb.mockReturnValue({ comment: { findUnique, update } });

    const res = await PATCH(patchRequest(false), context(VALID_ID));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledOnce();
  });
});

describe("DELETE /api/comments/[id]", () => {
  it("rejects a non-uuid id with 400", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: AUTHOR, role: "MEMBER" });

    const res = await DELETE(new Request("http://test", { method: "DELETE" }), context("bad"));

    expect(res.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("forbids a non-author from deleting", async () => {
    requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: OTHER, role: "MEMBER" });
    const findUnique = vi.fn().mockResolvedValue({ authorUserId: AUTHOR });
    const del = vi.fn();
    getDb.mockReturnValue({ comment: { findUnique, delete: del } });

    const res = await DELETE(new Request("http://test", { method: "DELETE" }), context(VALID_ID));

    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });
});
