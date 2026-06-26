import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPrisma } from "@/lib/db/client";
import { createServerSupabase } from "@/lib/supabase/server";

import { OrgList, type OrgOption } from "./org-list";

export default async function SelectOrganizationPage() {
  const t = await getTranslations("onboarding.selectOrg");

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeOrgId =
    typeof user.app_metadata?.active_org_id === "string" ? user.app_metadata.active_org_id : null;

  const memberships = await getPrisma().membership.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        select: { id: true, name: true, _count: { select: { memberships: true } } },
      },
    },
    orderBy: { organization: { name: "asc" } },
  });

  if (memberships.length === 0) redirect("/create-org");

  const orgs: OrgOption[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
    memberCount: m.organization._count.memberships,
    active: m.organization.id === activeOrgId,
  }));

  return (
    <Card className="py-6 shadow-sm">
      <CardHeader className="gap-1.5">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </CardHeader>
      <CardContent>
        <OrgList orgs={orgs} />
      </CardContent>
    </Card>
  );
}
