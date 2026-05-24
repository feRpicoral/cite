import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const t = await getTranslations("app.dashboard");

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <div className="border-border bg-card flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
        <FileText className="text-muted-foreground h-10 w-10" />
        <div className="space-y-1">
          <h2 className="text-base font-medium">{t("emptyTitle")}</h2>
          <p className="text-muted-foreground max-w-sm text-sm">{t("emptyBody")}</p>
        </div>
        <Button>{t("uploadCta")}</Button>
      </div>
    </div>
  );
}
