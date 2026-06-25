import { eventType, staticSchema } from "inngest";

import {
  type CitationJudgment,
  judgeAuditTarget,
  loadAuditTargets,
  persistJudgments,
} from "@/lib/audit/run";
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
    onFailure: ({ event, error, logger }) => {
      logger.error("citation audit failed", {
        messageId: event.data.event.data.messageId,
        error: error.message,
      });
    },
  },
  async ({ event, step }) => {
    const orgId = asOrgId(event.data.orgId);
    const messageId = event.data.messageId;

    const targets = await step.run("load-targets", () => loadAuditTargets(orgId, messageId));

    const judgments: CitationJudgment[] = [];
    for (const target of targets) {
      judgments.push(
        await step.run(`judge-${target.displayIndex}`, () => judgeAuditTarget(target)),
      );
    }

    await step.run("persist", () => persistJudgments(orgId, messageId, judgments));
  },
);
