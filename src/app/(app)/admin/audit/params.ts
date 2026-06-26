import type { CitationVerdict } from "@prisma/client";

import type { AuditSort, ListAuditsParams } from "@/lib/db/audit";

export const VERDICT_OPTIONS: CitationVerdict[] = ["SUPPORTED", "PARTIAL", "UNSUPPORTED"];

const SORT_OPTIONS: AuditSort[] = ["recent", "confidence"];

export interface AuditSearchParams {
  verdict?: CitationVerdict;
  sort?: AuditSort;
  search?: string;
}

export type RawAuditSearchParams = {
  verdict?: string;
  sort?: string;
  search?: string;
};

export function parseAuditSearchParams(raw: RawAuditSearchParams): AuditSearchParams {
  const verdict = VERDICT_OPTIONS.find((v) => v === raw.verdict);
  const sort = SORT_OPTIONS.find((s) => s === raw.sort);
  const search = raw.search?.trim();
  return {
    ...(verdict ? { verdict } : {}),
    ...(sort ? { sort } : {}),
    ...(search ? { search } : {}),
  };
}

export function toListParams(params: AuditSearchParams): ListAuditsParams {
  return {
    ...(params.verdict ? { verdict: params.verdict } : {}),
    ...(params.sort ? { sort: params.sort } : {}),
    ...(params.search ? { search: params.search } : {}),
  };
}
