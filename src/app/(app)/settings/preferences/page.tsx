import { fromPrismaLocale } from "@/i18n/config";
import { requireSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";

import { AccountForm } from "./account-form";
import { PreferencesForm } from "./preferences-form";

export default async function PreferencesPage() {
  const session = await requireSession();

  const user = await getPrisma().user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { locale: true, themePreference: true },
  });

  const initialTheme =
    user.themePreference === "DARK"
      ? "dark"
      : user.themePreference === "LIGHT"
        ? "light"
        : "system";

  return (
    <div className="space-y-6">
      <AccountForm initialName={session.userName ?? ""} initialEmail={session.email} />
      <PreferencesForm initialLocale={fromPrismaLocale(user.locale)} initialTheme={initialTheme} />
    </div>
  );
}
