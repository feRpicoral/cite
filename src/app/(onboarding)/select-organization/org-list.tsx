"use client";

import type { MembershipRole } from "@prisma/client";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { switchOrgAction } from "./actions";

export interface OrgOption {
  id: string;
  name: string;
  role: MembershipRole;
  memberCount: number;
  active: boolean;
}

const DEFAULT_TONE = "bg-primary text-primary-foreground";
const AVATAR_TONES = [
  DEFAULT_TONE,
  "bg-success text-success-foreground",
  "bg-warning text-warning-foreground",
];

function toneFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? DEFAULT_TONE;
}

export function OrgList({ orgs }: { orgs: OrgOption[] }) {
  const t = useTranslations("onboarding.selectOrg");
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  function select(orgId: string) {
    setActiveId(orgId);
    startTransition(async () => {
      const result = await switchOrgAction({ orgId });
      if (!result.ok) {
        setActiveId(null);
        toast.error(result.error || t("switchError"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {orgs.map((org) => (
          <button
            key={org.id}
            type="button"
            onClick={() => select(org.id)}
            disabled={pending}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors disabled:opacity-60",
              org.active
                ? "bg-primary/7 ring-primary/30 ring-1"
                : "ring-border hover:bg-muted ring-1",
            )}
          >
            <Avatar className="rounded-lg">
              <AvatarFallback className={cn("rounded-lg font-semibold", toneFor(org.id))}>
                {org.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{org.name}</p>
              <p className="text-muted-foreground text-xs">
                {org.role === "ADMIN" ? t("roleAdmin") : t("roleMember")} ·{" "}
                {t("memberCount", { count: org.memberCount })}
              </p>
            </div>
            {pending && activeId === org.id ? (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            ) : (
              <ChevronRight
                className={cn("size-4", org.active ? "text-primary" : "text-muted-foreground")}
              />
            )}
          </button>
        ))}
      </div>
      <Link
        href="/create-org"
        className="text-primary flex items-center gap-2 border-t pt-4 text-sm font-semibold hover:underline"
      >
        <Plus className="size-4" />
        {t("createNew")}
      </Link>
    </div>
  );
}
