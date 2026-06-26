import { Info, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";

import { OrgForm } from "./org-form";

export default async function OrgSettingsPage() {
  const session = await requireSession();
  const t = await getTranslations("settings.organization");
  const tRole = await getTranslations("settings.role");

  if (session.role === "ADMIN") {
    return (
      <OrgForm initialName={session.orgName} slug={session.orgSlug} roleLabel={tRole("ADMIN")} />
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{t("title")}</CardTitle>
          <Badge variant="secondary" className="gap-1 font-normal">
            <Lock className="size-3" />
            {t("readOnlyBadge")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field label={t("nameLabel")}>
          <p className="text-sm font-medium">{session.orgName}</p>
        </Field>
        <Field label={t("slugLabel")}>
          <p className="text-muted-foreground font-mono text-sm">cite.app/{session.orgSlug}</p>
        </Field>
        <Field label={t("roleLabel")}>
          <Badge variant="secondary">{tRole("MEMBER")}</Badge>
        </Field>
        <div className="border-border text-muted-foreground flex items-center gap-2 border-t pt-4 text-sm">
          <Info className="size-3.5 shrink-0" />
          {t("readOnlyHint")}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">{label}</p>
      {children}
    </div>
  );
}
