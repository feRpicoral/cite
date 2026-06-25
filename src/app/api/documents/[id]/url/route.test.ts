import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getDb = vi.fn();
const signedDocumentUrl = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));
vi.mock("@/lib/db/with-org", () => ({ getDb: (orgId: string) => getDb(orgId) }));
vi.mock("@/lib/storage/documents", () => ({
  signedDocumentUrl: (path: string, ttl: number) => signedDocumentUrl(path, ttl),
}));

import { GET } from "./route";

const VALID_ID = "33333333-3333-4333-8333-333333333333";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSession.mockResolvedValue({ orgId: "org-1" });
});

describe("GET /api/documents/[id]/url", () => {
  it("rejects a non-uuid id with 400 before touching the db", async () => {
    const res = await GET(new Request("http://test"), context("not-a-uuid"));

    expect(res.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 when the document is absent or cross-org", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    getDb.mockReturnValue({ document: { findUnique } });

    const res = await GET(new Request("http://test"), context(VALID_ID));

    expect(res.status).toBe(404);
    expect(signedDocumentUrl).not.toHaveBeenCalled();
  });
});
