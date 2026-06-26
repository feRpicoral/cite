import "server-only";

import { z } from "zod";

import { HAIKU_MODEL, structuredCall } from "@/lib/agents/llm";

const JudgeResultSchema = z.object({
  verdict: z.enum(["SUPPORTED", "PARTIAL", "UNSUPPORTED"]),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});
export type JudgeResult = z.infer<typeof JudgeResultSchema>;

// `confidence` is a support score, not the model's certainty in its label.
// The audit UI fills the confidence bar by this value and the dashboard sorts
// "lowest confidence" first to triage weak citations, so it must rise with how
// well the passage supports the claim and stay aligned with the verdict —
// otherwise an UNSUPPORTED claim the model is sure about would read as a
// near-full bar and sort away from the citations admins need to review.
const SYSTEM = `You judge whether a citation supports a claim. Read the cited passage, then read the sentence(s) in the assistant's answer that bear the citation marker. Decide:

- SUPPORTED: the passage substantiates the claim. A faithful paraphrase, summary, or reasonable inference grounded in the passage counts as supported — the claim need not appear verbatim. Synthesized wording is fine as long as the passage backs the substance.
- PARTIAL: the passage backs some of the claim but leaves another part unsupported or only weakly implied.
- UNSUPPORTED: the passage does not back the claim, or contradicts it.

Judge the substance, not the phrasing. Do not penalize a claim for restating the passage in different words. When the passage plainly backs the claim's substance, choose SUPPORTED.

Confidence is a support score from 0 to 1: how strongly the passage supports the claim. It must agree with the verdict — high (near 1) for SUPPORTED, low (near 0) for UNSUPPORTED, and in between for PARTIAL. Reasoning is at most two sentences.`;

interface JudgeInput {
  /** The bearing sentence(s) — the assistant's claim with the citation marker. */
  claim: string;
  passage: string;
  documentName: string;
}

/** Caller groups citations by message and persists the verdicts as CitationAudit rows. */
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
