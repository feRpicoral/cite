import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { processDocumentFn } from "@/lib/inngest/functions/process-document";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processDocumentFn],
});
