import { getTranslations } from "next-intl/server";

import { AuditSkeleton } from "./audit-skeleton";

export default async function Loading() {
  const t = await getTranslations("audit");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="font-heading text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-xs">{t("subtitle")}</p>
        </div>
      </header>
      <div className="flex-1 p-6">
        <AuditSkeleton />
      </div>
    </div>
  );
}
