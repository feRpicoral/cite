import type { AuditRow } from "@/lib/db/audit";

type Verdict = "SUPPORTED" | "PARTIAL" | "UNSUPPORTED";

export interface VerdictCounts {
  supported: number;
  partial: number;
  unsupported: number;
}

export interface MessageGroup {
  messageId: string;
  message: NonNullable<AuditRow["message"]>;
  audits: AuditRow[];
  counts: VerdictCounts;
  latestAt: Date;
  lowestConfidence: number;
}

export function aggregateOf(audits: { verdict: Verdict }[]) {
  const total = audits.length;
  const supported = audits.filter((a) => a.verdict === "SUPPORTED").length;
  const partial = audits.filter((a) => a.verdict === "PARTIAL").length;
  const unsupported = audits.filter((a) => a.verdict === "UNSUPPORTED").length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return {
    total,
    supported,
    partial,
    unsupported,
    supportedPct: pct(supported),
    partialPct: pct(partial),
    unsupportedPct: pct(unsupported),
  };
}

// Audits arrive flat (one per citation) but the UI lists one row per message.
// Group order is preserved from the incoming audit order so the upstream sort
// (recency or lowest confidence) still drives which message surfaces first.
export function groupByMessage(audits: AuditRow[]): MessageGroup[] {
  const groups = new Map<string, MessageGroup>();

  for (const audit of audits) {
    if (!audit.message) continue;

    const existing = groups.get(audit.messageId);
    if (existing) {
      existing.audits.push(audit);
      existing.counts[verdictKey(audit.verdict)] += 1;
      existing.lowestConfidence = Math.min(existing.lowestConfidence, audit.confidence);
      if (audit.createdAt > existing.latestAt) existing.latestAt = audit.createdAt;
      continue;
    }

    groups.set(audit.messageId, {
      messageId: audit.messageId,
      message: audit.message,
      audits: [audit],
      counts: {
        supported: audit.verdict === "SUPPORTED" ? 1 : 0,
        partial: audit.verdict === "PARTIAL" ? 1 : 0,
        unsupported: audit.verdict === "UNSUPPORTED" ? 1 : 0,
      },
      latestAt: audit.createdAt,
      lowestConfidence: audit.confidence,
    });
  }

  return Array.from(groups.values());
}

function verdictKey(verdict: Verdict): keyof VerdictCounts {
  if (verdict === "SUPPORTED") return "supported";
  if (verdict === "PARTIAL") return "partial";
  return "unsupported";
}
