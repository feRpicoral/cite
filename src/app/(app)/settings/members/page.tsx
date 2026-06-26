import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { InviteMemberForm } from "./invite-form";
import { MembersTable } from "./members-table";

export default async function MembersPage() {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";

  const db = getDb(session.orgId);

  // Memberships join `user.email` which lives on a non-tenant table. The
  // include is allowed because the parent membership row is already filtered
  // to this org.
  const memberships = await db.membership.findMany({
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Pending invites are an admin concern; members see only the roster.
  const invites = isAdmin
    ? await db.invite.findMany({
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const adminCount = memberships.filter((m) => m.role === "ADMIN").length;

  return (
    <div className="space-y-6">
      {isAdmin && <InviteMemberForm />}
      <MembersTable
        memberships={memberships.map((m) => ({
          id: m.id,
          userId: m.userId,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        currentUserId={session.userId}
        adminCount={adminCount}
        isAdmin={isAdmin}
      />
    </div>
  );
}
