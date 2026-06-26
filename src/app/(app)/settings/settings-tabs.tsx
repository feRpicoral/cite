"use client";

import { Loader2 } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { tabsListVariants } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface SettingsTabItem {
  href: string;
  label: string;
  badge?: string;
}

function TabPending() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null;
}

export function SettingsTabs({ tabs }: { tabs: SettingsTabItem[] }) {
  const pathname = usePathname();

  return (
    <div className={cn(tabsListVariants(), "h-9 overflow-x-auto")} role="tablist">
      {tabs.map((tab) => {
        // Exact match on the root tab so the org page doesn't stay active while
        // a deeper segment (preferences, members) is selected.
        const active =
          tab.href === "/settings" ? pathname === tab.href : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            data-active={active || undefined}
            className={cn(
              "text-foreground/60 hover:text-foreground focus-visible:ring-ring/50 data-active:bg-background data-active:text-foreground dark:text-muted-foreground dark:hover:text-foreground dark:data-active:bg-input/30 relative inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-none data-active:shadow-sm",
            )}
          >
            {tab.label}
            {tab.badge && (
              <Badge variant="secondary" className="px-1 py-0 font-mono text-[10px] uppercase">
                {tab.badge}
              </Badge>
            )}
            <TabPending />
          </Link>
        );
      })}
    </div>
  );
}
