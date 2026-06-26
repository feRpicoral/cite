"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

interface CollectionOption {
  id: string;
  name: string;
}

export function ConversationsToolbar({
  collections,
  total,
}: {
  collections: CollectionOption[];
  total: number;
}) {
  const t = useTranslations("conversationsList");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") ?? "";
  const currentCollection = searchParams.get("collection") ?? "";
  const [query, setQuery] = useState(currentQuery);
  const [syncedQuery, setSyncedQuery] = useState(currentQuery);

  if (currentQuery !== syncedQuery) {
    setSyncedQuery(currentQuery);
    setQuery(currentQuery);
  }

  const commit = (next: { q?: string; collection?: string }) => {
    const params = new URLSearchParams(searchParams);
    if ("q" in next) setOrDelete(params, "q", next.q);
    if ("collection" in next) setOrDelete(params, "collection", next.collection);
    params.delete("take");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = (value: string) => {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => commit({ q: value }), SEARCH_DEBOUNCE_MS);
  };

  const activeCollection = collections.find((c) => c.id === currentCollection);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-8"
          aria-label={t("searchPlaceholder")}
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            aria-label={t("clearSearch")}
            onClick={() => {
              setQuery("");
              if (debounce.current) clearTimeout(debounce.current);
              commit({ q: "" });
            }}
          >
            <X />
          </Button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" data-icon="inline-end">
            <span className="truncate">{activeCollection?.name ?? t("allCollections")}</span>
            <ChevronDown className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 w-56">
          <DropdownMenuRadioGroup
            value={currentCollection}
            onValueChange={(value) => commit({ collection: value })}
          >
            <DropdownMenuRadioItem value="">
              <span className="truncate">{t("allCollections")}</span>
            </DropdownMenuRadioItem>
            {collections.map((c) => (
              <DropdownMenuRadioItem key={c.id} value={c.id}>
                <span className="truncate">{c.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <span
        className={cn(
          "text-muted-foreground shrink-0 font-mono text-xs tabular-nums transition-opacity",
          pending && "opacity-50",
        )}
      >
        {t("total", { count: total })}
      </span>
    </div>
  );
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
  if (value && value.trim()) params.set(key, value.trim());
  else params.delete(key);
}
