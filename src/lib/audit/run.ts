import "server-only";

import { getPrisma } from "@/lib/db/client";
import { type OrgId } from "@/lib/db/types";

import { extractClaimsForMarkers, judgeCitation } from "./judge";

/**
 * Runs the LLM-judge audit for every citation on a single assistant message.
 * Idempotent — re-running upserts the existing CitationAudit rows.
 *
 * Cheap to call (Haiku) and bounded by the number of citations on the
 * message; for a typical 5-citation answer the total wall-clock is
 * ~3-5 seconds.
 */
export async function runMessageAudit(orgId: OrgId, messageId: string): Promise<void> {
  const prisma = getPrisma();
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      orgId: true,
      content: true,
      citations: {
        select: {
          displayIndex: true,
          quote: true,
          chunk: { select: { document: { select: { name: true } } } },
        },
      },
    },
  });
  if (!message || message.orgId !== orgId) return;
  if (message.citations.length === 0) return;

  const citationByIndex = new Map(message.citations.map((c) => [c.displayIndex, c]));
  const claims = extractClaimsForMarkers(message.content);

  // Group claims by displayIndex — pick the longest claim per index as the
  // judge input (longer = more context for the judge).
  const longestClaim = new Map<number, string>();
  for (const { displayIndex, claim } of claims) {
    const prev = longestClaim.get(displayIndex);
    if (!prev || claim.length > prev.length) longestClaim.set(displayIndex, claim);
  }

  const judgments = await Promise.all(
    Array.from(longestClaim.entries()).map(async ([displayIndex, claim]) => {
      const cite = citationByIndex.get(displayIndex);
      if (!cite) return null;
      const result = await judgeCitation({
        claim,
        passage: cite.quote,
        documentName: cite.chunk.document.name,
      });
      return { displayIndex, result };
    }),
  );

  await prisma.$transaction(
    judgments
      .filter((j): j is NonNullable<typeof j> => j !== null)
      .map((j) =>
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
