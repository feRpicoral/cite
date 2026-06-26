"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { VerdictBadge } from "@/components/cite/verdict-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type AuditSearchParams, VERDICT_OPTIONS } from "./params";

const SEARCH_DEBOUNCE_MS = 300;

export function AuditControls({ initial }: { initial: AuditSearchParams }) {
  const t = useTranslations("audit.controls");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(initial.search ?? "");

  const commit = useCallback(
    (next: Partial<Record<keyof AuditSearchParams, string | undefined>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === "" || value === "all") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === (initial.search ?? "")) return;
    const id = setTimeout(() => commit({ search: trimmed || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search, initial.search, commit]);

  const verdict = initial.verdict ?? "all";
  const sort = initial.sort ?? "recent";
  const hasFilters = verdict !== "all" || (initial.search ?? "") !== "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="pl-9"
        />
      </div>

      <Select
        value={verdict}
        onValueChange={(value) => commit({ verdict: value === "all" ? undefined : value })}
      >
        <SelectTrigger className="w-44" aria-label={t("verdictLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("verdictAll")}</SelectItem>
          {VERDICT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              <VerdictBadge verdict={option} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(value) => commit({ sort: value })}>
        <SelectTrigger className="w-48" aria-label={t("sortLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">{t("sortRecent")}</SelectItem>
          <SelectItem value="confidence">{t("sortConfidence")}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            commit({ search: undefined, verdict: undefined });
          }}
          className="text-muted-foreground"
        >
          <X className="size-4" />
          {t("clearFilter")}
        </Button>
      )}
    </div>
  );
}
