import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as JudgeModule from "./judge";
import { extractClaimsForMarkers, judgeCitation, type JudgeResult } from "./judge";
import { judgeAuditTarget } from "./run";

vi.mock("./judge", async (importOriginal) => {
  const actual = await importOriginal<typeof JudgeModule>();
  return { ...actual, judgeCitation: vi.fn() };
});

const verdictResult = (verdict: JudgeResult["verdict"], confidence = 0.9): JudgeResult => ({
  verdict,
  reasoning: verdict.toLowerCase(),
  confidence,
});

describe("extractClaimsForMarkers", () => {
  it("returns the bearing sentence for each marker", () => {
    const text = "The contract expires on January 1 [1]. Renewal requires written notice [2].";

    const claims = extractClaimsForMarkers(text);

    expect(claims).toEqual([
      { displayIndex: 1, claim: "The contract expires on January 1 [1]." },
      { displayIndex: 2, claim: "Renewal requires written notice [2]." },
    ]);
  });

  it("expands [n,m] into one claim per number", () => {
    const text = "Both clauses agree [1, 2].";

    const claims = extractClaimsForMarkers(text);

    expect(claims).toEqual([
      { displayIndex: 1, claim: "Both clauses agree [1, 2]." },
      { displayIndex: 2, claim: "Both clauses agree [1, 2]." },
    ]);
  });

  it("ignores text without markers", () => {
    const claims = extractClaimsForMarkers("No citations here.");

    expect(claims).toEqual([]);
  });

  it("returns the trailing fragment when text has no terminal punctuation", () => {
    const claims = extractClaimsForMarkers("trailing claim [3]");

    expect(claims).toEqual([{ displayIndex: 3, claim: "trailing claim [3]" }]);
  });
});

describe("judgeAuditTarget", () => {
  beforeEach(() => {
    vi.mocked(judgeCitation).mockReset();
  });

  it("judges every claim on a marker and keeps the worst verdict", async () => {
    vi.mocked(judgeCitation)
      .mockResolvedValueOnce(verdictResult("SUPPORTED"))
      .mockResolvedValueOnce(verdictResult("UNSUPPORTED"));

    const judgment = await judgeAuditTarget({
      displayIndex: 1,
      claims: ["A long well-supported sentence [1].", "Short claim [1]."],
      passage: "passage",
      documentName: "doc",
    });

    expect(judgeCitation).toHaveBeenCalledTimes(2);
    expect(judgment.displayIndex).toBe(1);
    expect(judgment.result.verdict).toBe("UNSUPPORTED");
  });

  it("prefers PARTIAL over SUPPORTED but loses to UNSUPPORTED", async () => {
    vi.mocked(judgeCitation)
      .mockResolvedValueOnce(verdictResult("PARTIAL"))
      .mockResolvedValueOnce(verdictResult("SUPPORTED"));

    const judgment = await judgeAuditTarget({
      displayIndex: 2,
      claims: ["claim a [2].", "claim b [2]."],
      passage: "passage",
      documentName: "doc",
    });

    expect(judgment.result.verdict).toBe("PARTIAL");
  });

  it("returns the single verdict when a marker has one claim", async () => {
    vi.mocked(judgeCitation).mockResolvedValueOnce(verdictResult("SUPPORTED", 0.42));

    const judgment = await judgeAuditTarget({
      displayIndex: 3,
      claims: ["only claim [3]."],
      passage: "passage",
      documentName: "doc",
    });

    expect(judgeCitation).toHaveBeenCalledTimes(1);
    expect(judgment.result).toEqual(verdictResult("SUPPORTED", 0.42));
  });

  it("keeps a high-confidence support score bound to the supported verdict", async () => {
    vi.mocked(judgeCitation).mockResolvedValueOnce(verdictResult("SUPPORTED", 0.99));

    const judgment = await judgeAuditTarget({
      displayIndex: 4,
      claims: ["strongly supported claim [4]."],
      passage: "passage",
      documentName: "doc",
    });

    expect(judgment.result.verdict).toBe("SUPPORTED");
    expect(judgment.result.confidence).toBe(0.99);
  });
});
