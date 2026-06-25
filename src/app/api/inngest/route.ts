import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { auditMessageFn } from "@/lib/inngest/functions/audit-message";
import { processDocumentFn } from "@/lib/inngest/functions/process-document";
import { reapStuckDocumentsFn } from "@/lib/inngest/functions/reap-stuck-documents";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processDocumentFn, auditMessageFn, reapStuckDocumentsFn],
});
