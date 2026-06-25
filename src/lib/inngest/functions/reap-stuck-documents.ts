import { DocumentStatus, type Prisma } from "@prisma/client";

import { getPrisma } from "@/lib/db/client";

import { inngest } from "../client";
import { INGESTION_FAILED_MESSAGE } from "./process-document";

const NON_TERMINAL_STATUSES: readonly DocumentStatus[] = [
  DocumentStatus.UPLOADING,
  DocumentStatus.EXTRACTING,
  DocumentStatus.CHUNKING,
  DocumentStatus.EMBEDDING,
];

export const STUCK_DOCUMENT_THRESHOLD_MS = 30 * 60 * 1000;

const REAP_SCHEDULE = "*/10 * * * *";

/**
 * A document whose status is non-terminal but hasn't advanced before `now -
 * thresholdMs` was abandoned by a worker that died without throwing (timeout,
 * OOM, SIGKILL), so `onFailure` never fired. The `@@index([orgId, status])`
 * backs the status filter.
 */
export function staleDocumentsWhere(now: Date, thresholdMs: number): Prisma.DocumentWhereInput {
  return {
    status: { in: [...NON_TERMINAL_STATUSES] },
    updatedAt: { lt: new Date(now.getTime() - thresholdMs) },
  };
}

export const reapStuckDocumentsFn = inngest.createFunction(
  {
    id: "reap-stuck-documents",
    name: "Fail documents stuck in a non-terminal status",
    triggers: [{ cron: REAP_SCHEDULE }],
  },
  async ({ step }) => {
    await step.run("reap", async () => {
      const where = staleDocumentsWhere(new Date(), STUCK_DOCUMENT_THRESHOLD_MS);
      await getPrisma().document.updateMany({
        where,
        data: { status: "FAILED", errorMessage: INGESTION_FAILED_MESSAGE },
      });
    });
  },
);
