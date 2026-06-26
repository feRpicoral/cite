import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/cite/empty-state";
import { Card } from "@/components/ui/card";
import { listAudits } from "@/lib/db/audit";
import type { OrgId } from "@/lib/db/types";

import { aggregateOf, groupByMessage } from "./aggregate";
import { AuditControls } from "./audit-controls";
import { AuditRow } from "./audit-row";
import { AuditSummary } from "./audit-summary";
import { type AuditSearchParams, toListParams } from "./params";

export async function AuditList({ orgId, params }: { orgId: OrgId; params: AuditSearchParams }) {
  const t = await getTranslations("audit");
  const { audits } = await listAudits(orgId, toListParams(params));
  const aggregate = aggregateOf(audits);
  const groups = groupByMessage(audits);

  const hasFilters = params.verdict != null || (params.search ?? "") !== "";

  return (
    <div className="space-y-4">
      <AuditSummary aggregate={aggregate} messageCount={groups.length} />

      <AuditControls initial={params} />

      {hasFilters && (
        <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {t("controls.resultsCount", { count: aggregate.total })}
        </p>
      )}

      {groups.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<ShieldCheck strokeWidth={1.8} />}
            tone={hasFilters ? "muted" : "primary"}
            title={hasFilters ? t("filteredEmpty.title") : t("empty.title")}
            description={hasFilters ? t("filteredEmpty.description") : t("empty.description")}
          />
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <div className="max-h-[calc(100vh-22rem)] overflow-y-auto">
            {groups.map((group) => (
              <AuditRow key={group.messageId} group={group} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
