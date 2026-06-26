import { UserMinus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/cite/empty-state";
import { SystemScreen } from "@/components/system/system-screen";
import { Button } from "@/components/ui/button";

export default async function RemovedPage() {
  const t = await getTranslations("system.removed");

  return (
    <SystemScreen>
      <EmptyState
        icon={<UserMinus />}
        title={t("title")}
        description={t("description")}
        tone="warning"
      >
        <Button asChild size="lg">
          <Link href="/dashboard">{t("continue")}</Link>
        </Button>
      </EmptyState>
    </SystemScreen>
  );
}
