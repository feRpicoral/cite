import { getLocale, getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { requireSession } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/db/dashboard";

import { AccuracyCard } from "./accuracy-card";
import { Onboarding } from "./onboarding";
import { RecentConversations } from "./recent-conversations";
import { RecentlyIndexed } from "./recently-indexed";
import { StatsGrid } from "./stats-grid";

const MORNING_END_HOUR = 12;
const EVENING_START_HOUR = 18;

export default async function DashboardPage() {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";
  const locale = (await getLocale()) as Locale;
  const summary = await getDashboardSummary(session.orgId);

  const isEmpty =
    summary.counts.collections === 0 &&
    summary.counts.documents === 0 &&
    summary.counts.conversations === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col">
        <Onboarding />
      </div>
    );
  }

  const t = await getTranslations("dashboard");
  const greetingName = session.userName ?? session.email.split("@")[0] ?? session.email;
  const greetingKey = greetingFor(new Date().getHours());
  const numberFormat = new Intl.NumberFormat(locale);

  return (
    <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
      <p className="text-muted-foreground text-[13px]">
        {t(`greeting.${greetingKey}`, { name: greetingName })}
        <span className="hidden sm:inline">
          {t.rich("greetingContext", {
            org: () => <span className="text-foreground font-semibold">{session.orgName}</span>,
          })}
        </span>
      </p>

      <StatsGrid
        counts={summary.counts}
        accuracy={summary.accuracy}
        isAdmin={isAdmin}
        numberFormat={numberFormat}
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:gap-5">
        <RecentConversations conversations={summary.recentConversations} locale={locale} />
        <div className="flex flex-col gap-4 lg:gap-5">
          <RecentlyIndexed documents={summary.recentDocuments} />
          {isAdmin && <AccuracyCard accuracy={summary.accuracy} />}
        </div>
      </div>
    </div>
  );
}

function greetingFor(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < MORNING_END_HOUR) return "morning";
  if (hour < EVENING_START_HOUR) return "afternoon";
  return "evening";
}
