import { eventType, staticSchema } from "inngest";

import { runMessageAudit } from "@/lib/audit/run";
import { asOrgId } from "@/lib/db/types";

import { inngest } from "../client";

export const messageSynthesized = eventType("message/synthesized", {
  schema: staticSchema<{ orgId: string; messageId: string }>(),
});

export const auditMessageFn = inngest.createFunction(
  {
    id: "audit-message",
    name: "Run citation-accuracy audit on a synthesized message",
    concurrency: { limit: 5 },
    triggers: [messageSynthesized],
  },
  async ({ event, step }) => {
    await step.run("judge", async () => {
      await runMessageAudit(asOrgId(event.data.orgId), event.data.messageId);
    });
  },
);
