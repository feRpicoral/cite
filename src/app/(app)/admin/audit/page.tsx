import { CheckCircle2, Circle, MinusCircle } from "lucide-react";

import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { aggregateOf } from "./aggregate";

export default async function AuditPage() {
  const session = await requireAdmin();
  const db = getDb(session.orgId);

  const audits = await db.citationAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const messageIds = Array.from(new Set(audits.map((a) => a.messageId)));
  const messages = await db.message.findMany({
    where: { id: { in: messageIds } },
    select: {
      id: true,
      content: true,
      createdAt: true,
      conversation: { select: { id: true, title: true } },
    },
  });
  const messageById = new Map(messages.map((m) => [m.id, m]));

  const grouped = new Map<string, typeof audits>();
  for (const a of audits) {
    const list = grouped.get(a.messageId) ?? [];
    list.push(a);
    grouped.set(a.messageId, list);
  }

  const rows = Array.from(grouped.entries())
    .map(([messageId, list]) => ({
      messageId,
      message: messageById.get(messageId),
      audits: list,
      counts: {
        supported: list.filter((a) => a.verdict === "SUPPORTED").length,
        partial: list.filter((a) => a.verdict === "PARTIAL").length,
        unsupported: list.filter((a) => a.verdict === "UNSUPPORTED").length,
      },
    }))
    .filter((r) => r.message != null);

  const aggregate = aggregateOf(rows.flatMap((r) => r.audits));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Citation accuracy</h1>
        <p className="text-muted-foreground text-xs">
          LLM-judge verdicts on every citation across recent assistant messages.
        </p>
      </header>
      <section className="grid grid-cols-3 gap-4 border-b px-6 py-5">
        <Stat
          label="Supported"
          value={`${aggregate.supportedPct}%`}
          sub={`${aggregate.supported} of ${aggregate.total}`}
          tone="ok"
        />
        <Stat
          label="Partial"
          value={`${aggregate.partialPct}%`}
          sub={`${aggregate.partial} of ${aggregate.total}`}
          tone="warn"
        />
        <Stat
          label="Unsupported"
          value={`${aggregate.unsupportedPct}%`}
          sub={`${aggregate.unsupported} of ${aggregate.total}`}
          tone="bad"
        />
      </section>
      <div className="flex flex-1 flex-col">
        {rows.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center p-12 text-sm">
            No audited messages yet. Ask a question with citations and check back in a few seconds.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.messageId} className="space-y-2 px-6 py-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted-foreground truncate text-xs">
                    {r.message?.conversation.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <Pill
                      icon={<CheckCircle2 className="h-3 w-3" />}
                      count={r.counts.supported}
                      tone="ok"
                    />
                    <Pill
                      icon={<Circle className="h-3 w-3" />}
                      count={r.counts.partial}
                      tone="warn"
                    />
                    <Pill
                      icon={<MinusCircle className="h-3 w-3" />}
                      count={r.counts.unsupported}
                      tone="bad"
                    />
                  </div>
                </div>
                <p className="line-clamp-3 text-sm">{r.message?.content}</p>
                <details className="text-muted-foreground text-xs">
                  <summary className="cursor-pointer">Per-citation verdicts</summary>
                  <ul className="mt-2 space-y-1">
                    {r.audits
                      .sort((a, b) => a.displayIndex - b.displayIndex)
                      .map((a) => (
                        <li key={a.id} className="flex gap-2">
                          <span className="font-mono text-[10px]">[{a.displayIndex}]</span>
                          <span
                            className={
                              a.verdict === "SUPPORTED"
                                ? "text-emerald-600"
                                : a.verdict === "PARTIAL"
                                  ? "text-amber-600"
                                  : "text-destructive"
                            }
                          >
                            {a.verdict.toLowerCase()}
                          </span>
                          <span>· {a.reasoning}</span>
                          <span className="ml-auto opacity-70">conf {a.confidence.toFixed(2)}</span>
                        </li>
                      ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "warn" | "bad";
}) {
  const color =
    tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-destructive";
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="text-muted-foreground text-xs">{sub}</p>
    </div>
  );
}

function Pill({
  icon,
  count,
  tone,
}: {
  icon: React.ReactNode;
  count: number;
  tone: "ok" | "warn" | "bad";
}) {
  const color =
    tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      {icon}
      <span>{count}</span>
    </span>
  );
}
