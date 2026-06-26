import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.fn();

vi.mock("@/lib/db/with-org", () => ({ getDb: (orgId: string) => getDb(orgId) }));

import { listAudits } from "./audit";
import { asOrgId } from "./types";

const ORG = asOrgId("00000000-0000-0000-0000-000000000001");

function makeDb(overrides: {
  auditFindMany?: ReturnType<typeof vi.fn>;
  messageFindMany?: ReturnType<typeof vi.fn>;
}) {
  return {
    citationAudit: { findMany: overrides.auditFindMany ?? vi.fn().mockResolvedValue([]) },
    message: { findMany: overrides.messageFindMany ?? vi.fn().mockResolvedValue([]) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listAudits", () => {
  it("filters by verdict and a 30-day window by default", async () => {
    const auditFindMany = vi.fn().mockResolvedValue([]);
    getDb.mockReturnValue(makeDb({ auditFindMany }));

    await listAudits(ORG, { verdict: "UNSUPPORTED" });

    const arg = auditFindMany.mock.calls[0]?.[0];
    expect(arg.where.verdict).toBe("UNSUPPORTED");
    expect(arg.where.createdAt.gte).toBeInstanceOf(Date);
  });

  it("sorts by confidence ascending when requested", async () => {
    const auditFindMany = vi.fn().mockResolvedValue([]);
    getDb.mockReturnValue(makeDb({ auditFindMany }));

    await listAudits(ORG, { sort: "confidence" });

    expect(auditFindMany.mock.calls[0]?.[0].orderBy).toEqual({ confidence: "asc" });
  });

  it("defaults to most-recent ordering", async () => {
    const auditFindMany = vi.fn().mockResolvedValue([]);
    getDb.mockReturnValue(makeDb({ auditFindMany }));

    await listAudits(ORG);

    expect(auditFindMany.mock.calls[0]?.[0].orderBy).toEqual({ createdAt: "desc" });
  });

  it("constrains audits to message ids matching the search term", async () => {
    const messageFindMany = vi
      .fn()
      .mockResolvedValueOnce([{ id: "m1" }, { id: "m2" }])
      .mockResolvedValueOnce([]);
    const auditFindMany = vi.fn().mockResolvedValue([]);
    getDb.mockReturnValue(makeDb({ auditFindMany, messageFindMany }));

    await listAudits(ORG, { search: "invoice" });

    expect(auditFindMany.mock.calls[0]?.[0].where.messageId).toEqual({ in: ["m1", "m2"] });
  });

  it("joins each audit to its message and leaves orphans null", async () => {
    const auditFindMany = vi.fn().mockResolvedValue([
      {
        id: "a1",
        messageId: "m1",
        displayIndex: 1,
        verdict: "SUPPORTED",
        reasoning: "ok",
        confidence: 0.9,
        createdAt: new Date("2026-06-01"),
      },
      {
        id: "a2",
        messageId: "gone",
        displayIndex: 1,
        verdict: "PARTIAL",
        reasoning: "meh",
        confidence: 0.4,
        createdAt: new Date("2026-06-02"),
      },
    ]);
    const messageFindMany = vi.fn().mockResolvedValue([
      {
        id: "m1",
        content: "answer",
        createdAt: new Date("2026-06-01"),
        conversation: { id: "c1", title: "Conv" },
        citations: [{ displayIndex: 1, quote: "the cited passage" }],
      },
    ]);
    getDb.mockReturnValue(makeDb({ auditFindMany, messageFindMany }));

    const { audits } = await listAudits(ORG);

    expect(audits[0]?.message?.conversation.title).toBe("Conv");
    expect(audits[0]?.quote).toBe("the cited passage");
    expect(audits[1]?.message).toBeNull();
    expect(audits[1]?.quote).toBeNull();
  });
});
