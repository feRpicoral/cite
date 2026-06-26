import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SystemScreen } from "@/components/system/system-screen";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("system.notFound");

  return (
    <SystemScreen>
      <div className="mb-7 flex items-center gap-2">
        <span className="bg-primary text-primary-foreground flex size-6.5 items-center justify-center rounded-[7px]">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 5 H6 V19 H9 M15 5 H18 V19 H15" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="text-lg font-semibold tracking-tight">Cite</span>
      </div>
      <p className="text-muted-foreground/55 font-mono text-6xl font-semibold tracking-tighter sm:text-7xl">
        {t("code")}
      </p>
      <h1 className="font-heading mt-4 text-lg font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground mt-2 max-w-xs text-center text-sm leading-relaxed">
        {t("description")}
      </p>
      <Button asChild size="lg" className="mt-5 w-full max-w-xs sm:w-auto">
        <Link href="/dashboard">{t("backToDashboard")}</Link>
      </Button>
    </SystemScreen>
  );
}
