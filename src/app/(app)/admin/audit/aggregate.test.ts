import type { CitationVerdict } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuditRow } from "@/lib/db/audit";

import { aggregateOf, groupByMessage } from "./aggregate";

function auditRow(overrides: Partial<AuditRow> & Pick<AuditRow, "id" | "messageId">): AuditRow {
  return {
    displayIndex: 1,
    verdict: "SUPPORTED" as CitationVerdict,
    reasoning: "",
    confidence: 0.9,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    message: {
      id: overrides.messageId,
      content: "",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      conversation: { id: "c1", title: "Conversation" },
    },
    ...overrides,
  };
}

describe("aggregateOf", () => {
  it("counts verdicts and rounds percentages", () => {
    const result = aggregateOf([
      { verdict: "SUPPORTED" },
      { verdict: "SUPPORTED" },
      { verdict: "PARTIAL" },
      { verdict: "UNSUPPORTED" },
    ]);

    expect(result).toEqual({
      total: 4,
      supported: 2,
      partial: 1,
      unsupported: 1,
      supportedPct: 50,
      partialPct: 25,
      unsupportedPct: 25,
    });
  });

  it("matches the filtered set when orphaned audits are excluded first", () => {
    const all = [
      { messageId: "kept", verdict: "SUPPORTED" as const },
      { messageId: "kept", verdict: "UNSUPPORTED" as const },
      { messageId: "orphan", verdict: "UNSUPPORTED" as const },
    ];
    const withMessage = new Set(["kept"]);

    const filtered = aggregateOf(all.filter((a) => withMessage.has(a.messageId)));

    expect(filtered.total).toBe(2);
    expect(filtered.unsupportedPct).toBe(50);
  });

  it("returns zero percentages for an empty set", () => {
    const result = aggregateOf([]);

    expect(result).toEqual({
      total: 0,
      supported: 0,
      partial: 0,
      unsupported: 0,
      supportedPct: 0,
      partialPct: 0,
      unsupportedPct: 0,
    });
  });
});

describe("groupByMessage", () => {
  it("collects audits into one group per message with verdict counts", () => {
    const groups = groupByMessage([
      auditRow({ id: "a1", messageId: "m1", verdict: "SUPPORTED" }),
      auditRow({ id: "a2", messageId: "m1", verdict: "PARTIAL" }),
      auditRow({ id: "a3", messageId: "m2", verdict: "UNSUPPORTED" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      messageId: "m1",
      counts: { supported: 1, partial: 1, unsupported: 0 },
    });
    expect(groups[0]!.audits).toHaveLength(2);
    expect(groups[1]!.counts).toEqual({ supported: 0, partial: 0, unsupported: 1 });
  });

  it("preserves the incoming audit order across groups", () => {
    const groups = groupByMessage([
      auditRow({ id: "a1", messageId: "second" }),
      auditRow({ id: "a2", messageId: "first" }),
    ]);

    expect(groups.map((g) => g.messageId)).toEqual(["second", "first"]);
  });

  it("tracks the lowest confidence and latest timestamp per group", () => {
    const groups = groupByMessage([
      auditRow({
        id: "a1",
        messageId: "m1",
        confidence: 0.8,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }),
      auditRow({
        id: "a2",
        messageId: "m1",
        confidence: 0.2,
        createdAt: new Date("2026-01-02T00:00:00Z"),
      }),
    ]);

    expect(groups[0]!.lowestConfidence).toBe(0.2);
    expect(groups[0]!.latestAt).toEqual(new Date("2026-01-02T00:00:00Z"));
  });

  it("drops audits whose message could not be resolved", () => {
    const groups = groupByMessage([auditRow({ id: "a1", messageId: "m1", message: null })]);

    expect(groups).toEqual([]);
  });
});
