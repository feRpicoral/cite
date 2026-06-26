import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionApi = vi.fn();
const getDb = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSessionApi: () => requireSessionApi() }));
vi.mock("@/lib/db/with-org", () => ({ getDb: (orgId: string) => getDb(orgId) }));
vi.mock("@/lib/ingestion/location", () => ({ parseLocation: (loc: unknown) => loc }));

import { GET } from "./route";

const MESSAGE_ID = "33333333-3333-4333-8333-333333333333";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function citation(displayIndex: number) {
  return {
    displayIndex,
    quote: `quote ${displayIndex}`,
    chunk: {
      id: `chunk-${displayIndex}`,
      documentId: `doc-${displayIndex}`,
      location: { kind: "pdf" },
      document: { name: `Doc ${displayIndex}` },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSessionApi.mockResolvedValue({ orgId: "org-1", userId: "user-1", role: "MEMBER" });
});

describe("GET /api/messages/[id]/citations", () => {
  it("returns 404 when the message is absent", async () => {
    const messageFindUnique = vi.fn().mockResolvedValue(null);
    const auditFindMany = vi.fn();
    getDb.mockReturnValue({
      message: { findUnique: messageFindUnique },
      citationAudit: { findMany: auditFindMany },
    });

    const res = await GET(new Request("http://test"), context(MESSAGE_ID));

    expect(res.status).toBe(404);
    expect(auditFindMany).not.toHaveBeenCalled();
  });

  it("merges audit verdicts onto matching citations by displayIndex", async () => {
    getDb.mockReturnValue({
      message: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: MESSAGE_ID, citations: [citation(1), citation(2)] }),
      },
      citationAudit: {
        findMany: vi.fn().mockResolvedValue([
          {
            displayIndex: 1,
            verdict: "SUPPORTED",
            confidence: 0.91,
            reasoning: "matches source",
          },
        ]),
      },
    });

    const res = await GET(new Request("http://test"), context(MESSAGE_ID));
    const body = await res.json();

    expect(body.citations[0]).toMatchObject({
      displayIndex: 1,
      verdict: "SUPPORTED",
      confidence: 0.91,
      reasoning: "matches source",
    });
    expect(body.citations[1]).toMatchObject({
      displayIndex: 2,
      verdict: null,
      confidence: null,
      reasoning: null,
    });
  });

  it("preserves existing citation fields alongside the additive verdict fields", async () => {
    getDb.mockReturnValue({
      message: {
        findUnique: vi.fn().mockResolvedValue({ id: MESSAGE_ID, citations: [citation(1)] }),
      },
      citationAudit: { findMany: vi.fn().mockResolvedValue([]) },
    });

    const res = await GET(new Request("http://test"), context(MESSAGE_ID));
    const body = await res.json();

    expect(body.citations[0]).toMatchObject({
      displayIndex: 1,
      quote: "quote 1",
      chunkId: "chunk-1",
      documentId: "doc-1",
      documentName: "Doc 1",
    });
  });
});
