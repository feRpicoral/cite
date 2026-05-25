"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { changeRoleAction, removeMemberAction, revokeInviteAction } from "./actions";

interface MemberRow {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MEMBER";
}

interface InviteRow {
  id: string;
  email: string | null;
  role: "ADMIN" | "MEMBER";
  expiresAt: string;
}

interface MembersTableProps {
  memberships: MemberRow[];
  invites: InviteRow[];
  currentUserId: string;
}

export function MembersTable({ memberships, invites, currentUserId }: MembersTableProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <div className="divide-border divide-y">
          {memberships.map((m) => (
            <MemberRowItem key={m.id} member={m} currentUserId={currentUserId} />
          ))}
        </div>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <div className="divide-border divide-y">
            {invites.map((i) => (
              <InviteRowItem key={i.id} invite={i} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MemberRowItem({ member, currentUserId }: { member: MemberRow; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeOpen, setRemoveOpen] = useState(false);

  const isSelf = member.userId === currentUserId;
  const initials = (member.name ?? member.email).slice(0, 2).toUpperCase();
  const nextRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";

  function changeRole() {
    startTransition(async () => {
      const result = await changeRoleAction({ membershipId: member.id, role: nextRole });
      if (result.ok) {
        toast.success("Role updated");
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
        toast.success("Member removed");
        setRemoveOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            {member.name ?? member.email}
            {isSelf && <span className="text-muted-foreground ml-1">(you)</span>}
          </p>
          <p className="text-muted-foreground text-xs">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
          {member.role === "ADMIN" ? "Admin" : "Member"}
        </Badge>
        {!isSelf && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={pending}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={changeRole}>
                Make {nextRole === "ADMIN" ? "admin" : "member"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  // Prevent the menu close from cancelling the dialog open.
                  e.preventDefault();
                  setRemoveOpen(true);
                }}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {member.name ?? member.email}?</DialogTitle>
            <DialogDescription>
              They lose access to this organization immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteRowItem({ invite }: { invite: InviteRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revokeOpen, setRevokeOpen] = useState(false);

  function revoke() {
    startTransition(async () => {
      const result = await revokeInviteAction({ inviteId: invite.id });
      if (result.ok) {
        toast.success("Invite revoked");
        setRevokeOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const expires = new Date(invite.expiresAt);
  const label = invite.email ?? "Open invite link";

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">
          {invite.role === "ADMIN" ? "Admin" : "Member"} · expires{" "}
          {expires.toLocaleDateString(undefined, { dateStyle: "short" })}
        </p>
      </div>
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <Button variant="ghost" size="sm" onClick={() => setRevokeOpen(true)} disabled={pending}>
          Revoke
        </Button>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke invite?</DialogTitle>
            <DialogDescription>
              The link stops working immediately. You can always create a new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={revoke} disabled={pending}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
