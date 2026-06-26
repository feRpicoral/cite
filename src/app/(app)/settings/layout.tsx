import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth/session";

import { type SettingsTabItem, SettingsTabs } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const t = await getTranslations("settings");
  const tTabs = await getTranslations("settings.tabs");
  const isAdmin = session.role === "ADMIN";

  const tabs: SettingsTabItem[] = [
    { href: "/settings", label: tTabs("organization") },
    { href: "/settings/preferences", label: tTabs("preferences") },
  ];
  if (isAdmin) {
    tabs.push({
      href: "/settings/members",
      label: tTabs("members"),
      badge: tTabs("adminBadge"),
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={t("title")}
        description={t("workspaceDescription", { orgName: session.orgName })}
      />
      <div className="border-border border-b px-4 py-2.5 sm:px-8">
        <SettingsTabs tabs={tabs} />
      </div>
      <div className="p-4 sm:p-8">{children}</div>
    </div>
  );
}
