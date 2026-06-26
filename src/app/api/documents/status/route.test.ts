import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionApi = vi.fn();
const getDb = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSessionApi: () => requireSessionApi() }));
vi.mock("@/lib/db/with-org", () => ({ getDb: (orgId: string) => getDb(orgId) }));

import { GET } from "./route";

const VALID_ID = "11111111-1111-4111-8111-111111111111";

function request(collectionId: string | null) {
  const url = new URL("http://test/api/documents/status");
  if (collectionId !== null) url.searchParams.set("collectionId", collectionId);
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSessionApi.mockResolvedValue({ orgId: "org-1" });
});

describe("GET /api/documents/status", () => {
  it("returns 400 when collectionId is missing or malformed", async () => {
    const res = await GET(request("not-a-uuid"));

    expect(res.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 when the collection is absent or cross-org", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const findMany = vi.fn();
    getDb.mockReturnValue({ collection: { findUnique }, document: { findMany } });

    const res = await GET(request(VALID_ID));

    expect(res.status).toBe(404);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns the lightweight status rows for the collection", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: VALID_ID });
    const documents = [
      { id: "d1", status: "EMBEDDING", errorMessage: null, pageCount: 3 },
      { id: "d2", status: "INDEXED", errorMessage: null, pageCount: 12 },
    ];
    const findMany = vi.fn().mockResolvedValue(documents);
    getDb.mockReturnValue({ collection: { findUnique }, document: { findMany } });

    const res = await GET(request(VALID_ID));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ documents });
  });
});
