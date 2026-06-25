import { getPrisma } from "@/lib/db/client";
import { asDocumentId, asOrgId, type DocumentId } from "@/lib/db/types";
import { parseStage, persistStage } from "@/lib/ingestion/pipeline";

import { documentUploaded, inngest } from "../client";

export const INGESTION_FAILED_MESSAGE =
  "We couldn't process this document. Please try uploading it again.";

export const processDocumentFn = inngest.createFunction(
  {
    id: "process-document",
    name: "Process uploaded document",
    concurrency: { limit: 5 },
    triggers: [documentUploaded],
    onFailure: async ({ event, error }) => {
      const documentId = asDocumentId(event.data.event.data.documentId);
      console.error("process-document failed", documentId, error);
      await markFailed(documentId);
    },
  },
  async ({ event, step }) => {
    const orgId = asOrgId(event.data.orgId);
    const documentId = asDocumentId(event.data.documentId);

    const normalized = await step.run("parse", () => parseStage(orgId, documentId));
    await step.run("persist", () => persistStage(orgId, documentId, normalized));
  },
);

async function markFailed(documentId: DocumentId): Promise<void> {
  await getPrisma().document.update({
    where: { id: documentId },
    data: { status: "FAILED", errorMessage: INGESTION_FAILED_MESSAGE },
  });
}
