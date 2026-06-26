"use client";

import { Link2, Mail, ShieldX, TriangleAlert, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/cite/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { changeRoleAction, removeMemberAction, revokeInviteAction } from "./actions";

type Role = "ADMIN" | "MEMBER";

interface MemberRow {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: Role;
}

interface InviteRow {
  id: string;
  email: string | null;
  role: Role;
  expiresAt: string;
}

interface MembersTableProps {
  memberships: MemberRow[];
  invites: InviteRow[];
  currentUserId: string;
  adminCount: number;
}

const AVATAR_TONES = [
  "bg-[oklch(0.72_0.07_215)]",
  "bg-[oklch(0.70_0.09_145)]",
  "bg-[oklch(0.68_0.10_35)]",
  "bg-[oklch(0.66_0.10_300)]",
  "bg-[oklch(0.70_0.09_85)]",
] as const;

function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length] ?? AVATAR_TONES[0];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function relativeExpiry(locale: string, expiresAt: string): string {
  const days = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / MS_PER_DAY));
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
}

export function MembersTable({
  memberships,
  invites,
  currentUserId,
  adminCount,
}: MembersTableProps) {
  const t = useTranslations("settings.members.table");

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-border border-b py-3">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <div className="divide-border divide-y">
          {memberships.map((m) => (
            <MemberRowItem
              key={m.id}
              member={m}
              currentUserId={currentUserId}
              adminCount={adminCount}
            />
          ))}
        </div>
      </Card>

      {invites.length > 0 && <PendingInvites invites={invites} />}
    </div>
  );
}

function MemberRowItem({
  member,
  currentUserId,
  adminCount,
}: {
  member: MemberRow;
  currentUserId: string;
  adminCount: number;
}) {
  const router = useRouter();
  const t = useTranslations("settings.members.table");
  const tDialog = useTranslations("settings.members.removeDialog");
  const tLastAdmin = useTranslations("settings.members.lastAdmin");
  const tRole = useTranslations("settings.role");
  const [pending, startTransition] = useTransition();
  const [removeOpen, setRemoveOpen] = useState(false);

  const isSelf = member.userId === currentUserId;
  const initials = (member.name ?? member.email).slice(0, 2).toUpperCase();
  // The last remaining admin can't be demoted or removed; the action enforces
  // this and we mirror it in the UI by locking the controls and showing an
  // inline alert.
  const isLastAdmin = member.role === "ADMIN" && adminCount <= 1;
  const locked = isSelf || isLastAdmin;

  function changeRole(role: Role) {
    if (role === member.role) return;
    startTransition(async () => {
      const result = await changeRoleAction({ membershipId: member.id, role });
      if (result.ok) {
        toast.success(t("roleUpdated"));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMemberAction({ membershipId: member.id });
      if (result.ok) {
        toast.success(t("memberRemoved"));
        setRemoveOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
      <Avatar className="size-9">
        <AvatarFallback className={cn("text-white", avatarTone(member.email))}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{member.name ?? member.email}</span>
          {isSelf && (
            <Badge className="bg-primary/12 text-primary border-transparent px-1.5 py-0 text-[10px]">
              {t("you")}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground truncate font-mono text-xs">{member.email}</p>
      </div>

      <div className="flex items-center gap-2">
        {locked ? (
          <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
            {tRole(member.role)}
          </Badge>
        ) : (
          <Select
            value={member.role}
            onValueChange={(v) => changeRole(v as Role)}
            disabled={pending}
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">{tRole("ADMIN")}</SelectItem>
              <SelectItem value="MEMBER">{tRole("MEMBER")}</SelectItem>
            </SelectContent>
          </Select>
        )}

        {!locked && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setRemoveOpen(true)}
            disabled={pending}
          >
            {t("remove")}
          </Button>
        )}
      </div>

      {isLastAdmin && (
        <div className="bg-warning/8 border-warning/30 text-warning flex w-full items-center gap-2.5 rounded-lg border px-3 py-2">
          <TriangleAlert className="size-4 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{tLastAdmin("title")}</p>
            <p className="text-warning/80 text-xs">{tLastAdmin("description")}</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        icon={<UserCog />}
        destructive
        loading={pending}
        title={tDialog("title", { name: member.name ?? member.email })}
        description={tDialog("description")}
        confirmLabel={tDialog("confirm")}
        onConfirm={remove}
      />
    </div>
  );
}

function PendingInvites({ invites }: { invites: InviteRow[] }) {
  const t = useTranslations("settings.members.pending");

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="border-border flex items-center gap-2 border-b py-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Badge variant="secondary" className="font-mono">
          {invites.length}
        </Badge>
      </CardHeader>
      <div className="divide-border divide-y">
        {invites.map((i) => (
          <InviteRowItem key={i.id} invite={i} />
        ))}
      </div>
    </Card>
  );
}

function InviteRowItem({ invite }: { invite: InviteRow }) {
  const router = useRouter();
  const t = useTranslations("settings.members.pending");
  const tDialog = useTranslations("settings.members.revokeDialog");
  const tRole = useTranslations("settings.role");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [revokeOpen, setRevokeOpen] = useState(false);

  function revoke() {
    startTransition(async () => {
      const result = await revokeInviteAction({ inviteId: invite.id });
      if (result.ok) {
        toast.success(t("revoked"));
        setRevokeOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const label = invite.email ?? t("openLink");
  const Icon = invite.email ? Mail : Link2;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      <span className="text-muted-foreground text-sm">{tRole(invite.role)}</span>
      <span className="text-muted-foreground font-mono text-xs">
        {t("expiresIn", { date: relativeExpiry(locale, invite.expiresAt) })}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={() => setRevokeOpen(true)}
        disabled={pending}
      >
        {t("revoke")}
      </Button>

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        icon={<ShieldX />}
        destructive
        loading={pending}
        title={tDialog("title")}
        description={tDialog("description")}
        confirmLabel={tDialog("confirm")}
        onConfirm={revoke}
      />
    </div>
  );
}
