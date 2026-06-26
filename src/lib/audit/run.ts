import "server-only";

import { getPrisma } from "@/lib/db/client";
import { type OrgId } from "@/lib/db/types";

import { extractClaimsForMarkers, judgeCitation, type JudgeResult } from "./judge";

export interface AuditTarget {
  displayIndex: number;
  claims: string[];
  passage: string;
  documentName: string;
}

export interface CitationJudgment {
  displayIndex: number;
  result: JudgeResult;
}

const VERDICT_SEVERITY: Record<JudgeResult["verdict"], number> = {
  SUPPORTED: 0,
  PARTIAL: 1,
  UNSUPPORTED: 2,
};

function isWorse(candidate: JudgeResult, current: JudgeResult): boolean {
  return VERDICT_SEVERITY[candidate.verdict] > VERDICT_SEVERITY[current.verdict];
}

// Judge against the full chunk text, not the 500-char UI quote snapshot — a
// claim supported by text past the truncation point would otherwise read as
// UNSUPPORTED. Capped to bound the judge prompt.
const MAX_PASSAGE_LEN = 4_000;

/**
 * Loads a message's citations and groups every citation-bearing claim under its
 * marker. Returns one target per citation marker with all claims that reference
 * it, or an empty list when the message is missing, foreign, or uncited.
 */
export async function loadAuditTargets(orgId: OrgId, messageId: string): Promise<AuditTarget[]> {
  const prisma = getPrisma();
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      orgId: true,
      content: true,
      citations: {
        select: {
          displayIndex: true,
          chunk: { select: { text: true, document: { select: { name: true } } } },
        },
      },
    },
  });
  if (!message || message.orgId !== orgId) return [];
  if (message.citations.length === 0) return [];

  const citationByIndex = new Map(message.citations.map((c) => [c.displayIndex, c]));
  const claimsByIndex = new Map<number, string[]>();
  for (const { displayIndex, claim } of extractClaimsForMarkers(message.content)) {
    if (!citationByIndex.has(displayIndex)) continue;
    const list = claimsByIndex.get(displayIndex) ?? [];
    list.push(claim);
    claimsByIndex.set(displayIndex, list);
  }

  return Array.from(claimsByIndex.entries()).map(([displayIndex, claims]) => {
    const cite = citationByIndex.get(displayIndex)!;
    return {
      displayIndex,
      claims,
      passage: cite.chunk.text.slice(0, MAX_PASSAGE_LEN),
      documentName: cite.chunk.document.name,
    };
  });
}

/**
 * Judges every claim that bears a marker and keeps the worst verdict
 * (UNSUPPORTED beats PARTIAL beats SUPPORTED) so a short unsupported claim is
 * never masked by a longer supported one on the same marker.
 */
export async function judgeAuditTarget(target: AuditTarget): Promise<CitationJudgment> {
  const results = await Promise.all(
    target.claims.map((claim) =>
      judgeCitation({ claim, passage: target.passage, documentName: target.documentName }),
    ),
  );

  let worst = results[0]!;
  for (const result of results.slice(1)) {
    if (isWorse(result, worst)) worst = result;
  }

  return { displayIndex: target.displayIndex, result: worst };
}

export async function persistJudgments(
  orgId: OrgId,
  messageId: string,
  judgments: CitationJudgment[],
): Promise<void> {
  if (judgments.length === 0) return;
  const prisma = getPrisma();
  await prisma.$transaction(
    judgments.map((j) =>
      prisma.citationAudit.upsert({
        where: { messageId_displayIndex: { messageId, displayIndex: j.displayIndex } },
        create: {
          orgId,
          messageId,
          displayIndex: j.displayIndex,
          verdict: j.result.verdict,
          reasoning: j.result.reasoning,
          confidence: j.result.confidence,
        },
        update: {
          verdict: j.result.verdict,
          reasoning: j.result.reasoning,
          confidence: j.result.confidence,
        },
      }),
    ),
  );
}

/**
 * Runs the LLM-judge audit for every citation on a single assistant message.
 * Idempotent — re-running upserts the existing CitationAudit rows.
 *
 * Cheap to call (Haiku) and bounded by the number of citations on the
 * message; for a typical 5-citation answer the total wall-clock is
 * ~3-5 seconds.
 */
export async function runMessageAudit(orgId: OrgId, messageId: string): Promise<void> {
  const targets = await loadAuditTargets(orgId, messageId);
  const judgments = await Promise.all(targets.map((target) => judgeAuditTarget(target)));
  await persistJudgments(orgId, messageId, judgments);
}
