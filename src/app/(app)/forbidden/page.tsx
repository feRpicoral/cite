import { Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/cite/empty-state";
import { Button } from "@/components/ui/button";

export default async function ForbiddenPage() {
  const t = await getTranslations("system.forbidden");

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <EmptyState icon={<Lock />} title={t("title")} description={t("description")}>
        <Button asChild variant="outline">
          <Link href="/dashboard">{t("backToDashboard")}</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
