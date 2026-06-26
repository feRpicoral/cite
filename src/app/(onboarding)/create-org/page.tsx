import { getTranslations } from "next-intl/server";

import { AuthCard } from "../../(auth)/auth-card";
import { CreateOrgForm } from "./create-org-form";

export default async function CreateOrgPage() {
  const t = await getTranslations("onboarding.createOrg");

  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      <CreateOrgForm />
    </AuthCard>
  );
}
