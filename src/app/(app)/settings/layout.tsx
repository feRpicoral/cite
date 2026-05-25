import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth/session";

import { TabLink } from "./tab-link";

type SettingsTabKey = "organization" | "preferences" | "members";

interface SettingsTab {
  href: string;
  labelKey: SettingsTabKey;
  adminOnly?: boolean;
}

const TABS: SettingsTab[] = [
  { href: "/settings", labelKey: "organization" },
  { href: "/settings/preferences", labelKey: "preferences" },
  { href: "/settings/members", labelKey: "members", adminOnly: true },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const t = await getTranslations("settings");
  const tTabs = await getTranslations("settings.tabs");
  const visible = TABS.filter((tab) => !tab.adminOnly || session.role === "ADMIN");

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={t("title")}
        description={t("workspaceDescription", { orgName: session.orgName })}
      />
      <div className="border-border border-b px-8">
        <nav className="-mb-px flex gap-6">
          {visible.map((tab) => (
            <TabLink key={tab.href} href={tab.href} label={tTabs(tab.labelKey)} />
          ))}
        </nav>
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}
