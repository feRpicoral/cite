import { CircleX, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

import { AcceptInviteForm } from "./accept-form";
import { InviteShell } from "./invite-shell";

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

type FailureVariant = "expired" | "notFound" | "mismatch";

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;
  const t = await getTranslations("auth.acceptInvite");

  if (!token) return <Failure variant="notFound" />;

  // Bounce signed-out visitors to login, preserving the invite link so we
  // return here after auth.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/accept-invite?token=${encodeURIComponent(token)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // Unscoped lookup — invite tokens are global by design. We don't reveal
  // org details if the invite doesn't exist or is expired.
  const invite = await getPrisma().invite.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true, slug: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!invite) return <Failure variant="notFound" />;
  if (invite.expiresAt < new Date()) return <Failure variant="expired" />;
  if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return (
      <Failure variant="mismatch" invitedEmail={invite.email} currentEmail={user.email ?? ""} />
    );
  }

  const roleLabel = invite.role === "ADMIN" ? t("roleAdmin") : t("roleMember");

  return (
    <InviteShell>
      <Card className="py-6 text-center shadow-sm">
        <CardHeader className="items-center gap-4">
          <p className="text-muted-foreground text-sm">
            {invite.createdBy.name ? t("invitedBy", { name: invite.createdBy.name }) : t("invited")}
          </p>
          <div className="flex flex-col items-center gap-2.5">
            <Avatar size="lg" className="size-13 rounded-xl">
              <AvatarFallback className="bg-primary text-primary-foreground rounded-xl text-xl font-semibold">
                {invite.organization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight">
                {invite.organization.name}
              </h1>
              <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                cite.app/{invite.organization.slug}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/40 ring-border flex items-center justify-center gap-2 rounded-lg p-2.5 text-sm ring-1">
            <span className="text-muted-foreground">{t("joinAs")}</span>
            <Badge variant="secondary">{roleLabel}</Badge>
          </div>
          <p className="text-muted-foreground flex items-start gap-2 text-left text-xs leading-relaxed">
            <Info className="mt-px size-3.5 shrink-0" />
            {t("switchNote", { org: invite.organization.name })}
          </p>
          <AcceptInviteForm
            token={token}
            labels={{
              accept: t("accept"),
              decline: t("decline"),
              welcome: t("welcome"),
            }}
          />
        </CardContent>
      </Card>
    </InviteShell>
  );
}

async function Failure({
  variant,
  invitedEmail,
  currentEmail,
}: {
  variant: FailureVariant;
  invitedEmail?: string;
  currentEmail?: string;
}) {
  const t = await getTranslations("auth.acceptInvite");

  const config = {
    expired: { Icon: TriangleAlert, tone: "warning" as const },
    notFound: { Icon: CircleX, tone: "destructive" as const },
    mismatch: { Icon: TriangleAlert, tone: "warning" as const },
  }[variant];

  const toneClass =
    config.tone === "destructive"
      ? "bg-destructive/12 text-destructive"
      : "bg-warning/15 text-warning";

  return (
    <InviteShell>
      <Card className="py-5 shadow-sm">
        <CardContent className="flex gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5 ${toneClass}`}
          >
            <config.Icon strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{t(`${variant}Title`)}</p>
            {variant === "mismatch" ? (
              <>
                <p className="text-muted-foreground text-[13px] leading-snug">
                  {t.rich("mismatchBody", {
                    invited: invitedEmail ?? "",
                    current: currentEmail ?? "",
                    strong: (chunks) => (
                      <span className="text-foreground font-semibold">{chunks}</span>
                    ),
                  })}
                </p>
                <Link href="/login" className="text-primary text-xs font-semibold hover:underline">
                  {t("switchAccount")} →
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground text-[13px] leading-snug">
                {t(`${variant}Body`)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </InviteShell>
  );
}
