import { getPrisma } from "@/lib/db/client";
import { asDocumentId, asOrgId } from "@/lib/db/types";
import { processDocument } from "@/lib/ingestion/pipeline";

import { documentUploaded, inngest } from "../client";

export const processDocumentFn = inngest.createFunction(
  {
    id: "process-document",
    name: "Process uploaded document",
    concurrency: { limit: 5 },
    triggers: [documentUploaded],
  },
  async ({ event, step }) => {
    const orgId = asOrgId(event.data.orgId);
    const documentId = asDocumentId(event.data.documentId);

    await step.run("process", async () => {
      try {
        await processDocument(orgId, documentId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await getPrisma().document.update({
          where: { id: documentId },
          data: { status: "FAILED", errorMessage: message },
        });
        throw err;
      }
    });
  },
);
