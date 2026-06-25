import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionApi = vi.fn();
const getDb = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSessionApi: () => requireSessionApi() }));
vi.mock("@/lib/db/with-org", () => ({ getDb: (orgId: string) => getDb(orgId) }));

import { GET } from "./route";

const VALID_ID = "11111111-1111-4111-8111-111111111111";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSessionApi.mockResolvedValue({ orgId: "org-1" });
});

describe("GET /api/documents/[id]/parts", () => {
  it("returns 404 when the document is absent or cross-org", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const findMany = vi.fn();
    getDb.mockReturnValue({ document: { findUnique }, documentPart: { findMany } });

    const res = await GET(new Request("http://test"), context(VALID_ID));

    expect(res.status).toBe(404);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns parts when the document exists", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: VALID_ID });
    const parts = [{ index: 0, body: "<p>x</p>", metadata: null }];
    const findMany = vi.fn().mockResolvedValue(parts);
    getDb.mockReturnValue({ document: { findUnique }, documentPart: { findMany } });

    const res = await GET(new Request("http://test"), context(VALID_ID));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ parts });
  });
});
