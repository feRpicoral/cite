type Verdict = "SUPPORTED" | "PARTIAL" | "UNSUPPORTED";

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
