import { getTranslations } from "next-intl/server";

import { CreateOrgForm } from "./create-org-form";

export default async function CreateOrgPage() {
  const t = await getTranslations("onboarding.createOrg");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
      <CreateOrgForm />
    </div>
  );
}
