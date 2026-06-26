"use server";

import { Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { getDb } from "@/lib/db/with-org";
import { appUrl } from "@/lib/env";
import { slugify } from "@/lib/slug";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Result } from "@/lib/types/result";

// 32 lowercase-alphanumeric chars, ~165 bits of entropy. Unique constraint
// on `Invite.token` makes the collision-by-luck risk effectively zero.
const tokenGen = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CreateInviteSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

/**
 * Generates a shareable invite link. Cite doesn't run an email sender, so
 * the admin copies the returned URL and shares it manually.
 */
export async function createInviteAction(
  input: z.infer<typeof CreateInviteSchema>,
): Promise<Result<{ url: string }>> {
  const session = await requireAdmin();
  const parsed = CreateInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid email." };

  const email = parsed.data.email?.toLowerCase() ?? null;
  if (parsed.data.role === "ADMIN" && !email) {
    return { ok: false, error: "Admin invites must be pinned to an email address." };
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const token = tokenGen();

  // Guard against inviting an existing member. Scoped via getDb so we can
  // only see rows in this org.
  const db = getDb(session.orgId);
  if (email) {
    const existing = await db.membership.findFirst({
      where: { user: { email } },
    });
    if (existing) return { ok: false, error: "That email is already a member." };
  }

  // No (orgId, email) unique constraint in the schema, so we do find-then-
  // create-or-update rather than upsert. Race window is tiny and worst case
  // is two pending invites for the same email — harmless, the second one
  // wins on accept.
  const existing = email
    ? await db.invite.findFirst({ where: { orgId: session.orgId, email } })
    : null;

  const invite = existing
    ? await db.invite.update({
        where: { id: existing.id },
        data: {
          role: parsed.data.role,
          token,
          acceptedAt: null,
          createdByUserId: session.userId,
          expiresAt,
        },
      })
    : await db.invite.create({
        data: {
          orgId: session.orgId,
          email,
          role: parsed.data.role,
          token,
          createdByUserId: session.userId,
          expiresAt,
        },
      });

  const url = new URL(`/accept-invite?token=${invite.token}`, appUrl()).toString();

  revalidatePath("/settings/members");
  return { ok: true, url };
}

const UpdateOrgSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(60),
});

export async function updateOrgAction(input: z.infer<typeof UpdateOrgSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = UpdateOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid organization details." };

  const slug = slugify(parsed.data.slug);
  if (!slug) return { ok: false, error: "Enter a valid workspace URL." };

  // Organization is not a tenant-scoped model, so getDb won't inject orgId.
  // The session's orgId is already verified via membership in getSession.
  try {
    await getPrisma().organization.update({
      where: { id: session.orgId },
      data: { name: parsed.data.name, slug },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: `The URL cite.app/${slug} is taken.` };
    }
    throw err;
  }
  revalidatePath("/settings", "layout");
  return { ok: true };
}

const RevokeInviteSchema = z.object({ inviteId: z.string().uuid() });

export async function revokeInviteAction(
  input: z.infer<typeof RevokeInviteSchema>,
): Promise<Result> {
  const session = await requireAdmin();
  const parsed = RevokeInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite id." };

  // Org-scoped delete; deleteMany returns 0 if the row isn't ours, which
  // is the right no-op behavior.
  const db = getDb(session.orgId);
  await db.invite.deleteMany({ where: { id: parsed.data.inviteId } });
  revalidatePath("/settings/members");
  return { ok: true };
}

const ChangeRoleSchema = z.object({
  membershipId: z.string().uuid(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function changeRoleAction(input: z.infer<typeof ChangeRoleSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = ChangeRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const db = getDb(session.orgId);

  // Serializable so concurrent demotions can't both pass the admin-count
  // check and leave the org with zero admins.
  try {
    await db.$transaction(
      async (tx) => {
        const membership = await tx.membership.findUnique({
          where: { id: parsed.data.membershipId },
        });
        if (!membership) throw new MemberNotFoundError();
        if (membership.userId === session.userId) throw new CannotChangeSelfError();
        if (parsed.data.role === "MEMBER" && membership.role === "ADMIN") {
          const adminCount = await tx.membership.count({
            where: { orgId: session.orgId, role: "ADMIN" },
          });
          if (adminCount <= 1) throw new LastAdminError();
        }
        await tx.membership.update({
          where: { id: parsed.data.membershipId },
          data: { role: parsed.data.role },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof MemberNotFoundError) return { ok: false, error: "Member not found." };
    if (err instanceof CannotChangeSelfError) {
      return { ok: false, error: "You can't change your own role." };
    }
    if (err instanceof LastAdminError) {
      return { ok: false, error: "Can't demote the last admin." };
    }
    throw err;
  }

  revalidatePath("/settings/members");
  return { ok: true };
}

const RemoveSchema = z.object({ membershipId: z.string().uuid() });

export async function removeMemberAction(input: z.infer<typeof RemoveSchema>): Promise<Result> {
  const session = await requireAdmin();
  const parsed = RemoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const db = getDb(session.orgId);
  try {
    await db.$transaction(
      async (tx) => {
        const membership = await tx.membership.findUnique({
          where: { id: parsed.data.membershipId },
        });
        if (!membership) throw new MemberNotFoundError();
        if (membership.userId === session.userId) throw new CannotChangeSelfError();
        if (membership.role === "ADMIN") {
          const adminCount = await tx.membership.count({
            where: { orgId: session.orgId, role: "ADMIN" },
          });
          if (adminCount <= 1) throw new LastAdminError();
        }
        await tx.membership.delete({ where: { id: parsed.data.membershipId } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof MemberNotFoundError) return { ok: false, error: "Member not found." };
    if (err instanceof CannotChangeSelfError) {
      return { ok: false, error: "You can't remove yourself. Have another admin do it." };
    }
    if (err instanceof LastAdminError) {
      return { ok: false, error: "Can't remove the last admin." };
    }
    throw err;
  }

  // We deliberately don't clear the removed user's app_metadata.active_org_id.
  // Their next request fails the membership lookup in (app)/layout.tsx and
  // they're redirected to /create-org — the correct end state.
  revalidatePath("/settings/members");
  return { ok: true };
}

const AcceptInviteSchema = z.object({ token: z.string().min(8) });

/**
 * Consume an invite token: validate, mark accepted, create a Membership in
 * the token's org, set the new user's active_org_id. Idempotent: replays
 * with the same accepted token return ok if the user already belongs to
 * the org.
 */
export async function acceptInviteAction(
  input: z.infer<typeof AcceptInviteSchema>,
): Promise<Result<{ orgId: string }>> {
  const parsed = AcceptInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite." };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, error: "Sign in to accept the invite." };

  // Unscoped DB read — invite tokens are global, and the lookup must work
  // before the user is a member of the target org.
  const prisma = getPrisma();
  const invite = await prisma.invite.findUnique({ where: { token: parsed.data.token } });
  if (!invite) return { ok: false, error: "Invite not found or already revoked." };
  if (invite.expiresAt < new Date()) return { ok: false, error: "Invite has expired." };
  if (invite.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "This invite is for a different email address." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({
        where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
      });

      // Already in this org — accepting (even an unused open link) is a no-op
      // we reject so the user gets clear feedback instead of silently consuming
      // the invite.
      if (existing) throw new AlreadyMemberError();
      // A stamped token is single-use.
      if (invite.acceptedAt) throw new InviteAlreadyAcceptedError();

      await tx.membership.create({
        data: { orgId: invite.orgId, userId: user.id, role: invite.role },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });
  } catch (err) {
    if (err instanceof AlreadyMemberError) {
      return { ok: false, error: "You're already a member of this organization." };
    }
    if (err instanceof InviteAlreadyAcceptedError) {
      return { ok: false, error: "This invite has already been used." };
    }
    // Concurrent accept by the same user: the membership unique constraint
    // fires for the loser. They are now a member, so treat it as success.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: true, orgId: invite.orgId };
    }
    throw err;
  }

  const admin = getServiceSupabase();
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, active_org_id: invite.orgId },
  });

  return { ok: true, orgId: invite.orgId };
}

class MemberNotFoundError extends Error {
  constructor() {
    super("member_not_found");
    this.name = "MemberNotFoundError";
  }
}
class CannotChangeSelfError extends Error {
  constructor() {
    super("cannot_change_self");
    this.name = "CannotChangeSelfError";
  }
}
class LastAdminError extends Error {
  constructor() {
    super("last_admin");
    this.name = "LastAdminError";
  }
}
class InviteAlreadyAcceptedError extends Error {
  constructor() {
    super("invite_already_accepted");
    this.name = "InviteAlreadyAcceptedError";
  }
}
class AlreadyMemberError extends Error {
  constructor() {
    super("already_member");
    this.name = "AlreadyMemberError";
  }
}
