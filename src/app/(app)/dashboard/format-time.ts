import type { Locale } from "@/i18n/config";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const RELATIVE_DAY_THRESHOLD = 7;

/**
 * Short activity timestamp: relative for the last week ("2h ago", "Yesterday",
 * "3d ago"), absolute month/day beyond that ("Apr 18"). Matches the dashboard's
 * recent-activity lists where exact times add noise.
 */
export function formatRelativeTime(date: Date, locale: Locale, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });

  if (diffMs < MS_PER_HOUR) {
    const minutes = Math.max(1, Math.round(diffMs / MS_PER_MINUTE));
    return rtf.format(-minutes, "minute");
  }

  if (diffMs < MS_PER_DAY) {
    return rtf.format(-Math.round(diffMs / MS_PER_HOUR), "hour");
  }

  const days = Math.round(diffMs / MS_PER_DAY);
  if (days < RELATIVE_DAY_THRESHOLD) {
    return rtf.format(-days, "day");
  }

  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
}
