import { AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

import { AcceptInviteForm } from "./accept-form";

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;
  if (!token) return <Failed message="Missing invite token." />;

  // Bounce unsigned-in visitors to login, preserving the invite link so we
  // return here after auth. Signed-up users will hit signup first by the
  // login page's link, then return.
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
    include: { organization: { select: { name: true } } },
  });
  if (!invite) return <Failed message="Invite not found or already revoked." />;
  if (invite.expiresAt < new Date()) return <Failed message="This invite has expired." />;
  if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return <Failed message="This invite is for a different email address." />;
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {invite.organization.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited as {invite.role === "ADMIN" ? "an admin" : "a member"}.
            Accepting will switch your active workspace to this one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInviteForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="text-destructive h-5 w-5" />
            <CardTitle>Can&apos;t accept this invite</CardTitle>
          </div>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
