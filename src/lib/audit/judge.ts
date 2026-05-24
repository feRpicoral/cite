import "server-only";

import { z } from "zod";

import { HAIKU_MODEL, structuredCall } from "@/lib/agents/llm";

const JudgeResultSchema = z.object({
  verdict: z.enum(["SUPPORTED", "PARTIAL", "UNSUPPORTED"]),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});
export type JudgeResult = z.infer<typeof JudgeResultSchema>;

const SYSTEM = `You judge whether a citation supports a claim. Read the cited passage, then read the sentence(s) in the assistant's answer that bear the citation marker. Decide:

- SUPPORTED: every claim in those sentences is directly supported by the passage.
- PARTIAL: some claims are supported, others aren't (or are inferred without backing).
- UNSUPPORTED: the passage doesn't support the cited claims.

Confidence is your own (0..1). Reasoning is at most two sentences.`;

interface JudgeInput {
  /** The bearing sentence(s) — the assistant's claim with the citation marker. */
  claim: string;
  /** The cited passage text the user can click through to verify. */
  passage: string;
  /** Human-readable name of the source document for context. */
  documentName: string;
}

/**
 * One judge call per citation. Cheap (Haiku) and parallelizable.
 * Caller is responsible for grouping citations to messages and persisting
 * results as CitationAudit rows.
 */
export async function judgeCitation(input: JudgeInput): Promise<JudgeResult> {
  const user = `Cited passage (from ${input.documentName}):\n"""${input.passage}"""\n\nAssistant claim:\n"""${input.claim}"""\n\nJudge the citation.`;

  return structuredCall({
    model: HAIKU_MODEL,
    system: SYSTEM,
    user,
    schema: JudgeResultSchema,
    toolName: "record_verdict",
    toolDescription: "Record the verdict, reasoning, and confidence",
    maxTokens: 512,
  });
}

/**
 * Splits the assistant's text into citation-bearing claims. For each citation
 * marker [n], returns the sentence ending in that marker (or, if the marker
 * is mid-sentence, the surrounding clause). Multi-marker clauses like [1,3]
 * are emitted once per number.
 */
export function extractClaimsForMarkers(text: string): { displayIndex: number; claim: string }[] {
  const out: { displayIndex: number; claim: string }[] = [];
  // Split on sentence-ending punctuation but keep the punctuation attached.
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  for (const sentence of sentences) {
    const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sentence)) !== null) {
      for (const part of m[1]!.split(",")) {
        const n = Number(part.trim());
        if (Number.isFinite(n) && n > 0) {
          out.push({ displayIndex: n, claim: sentence.trim() });
        }
      }
    }
  }
  return out;
}
