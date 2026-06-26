"use client";

import { useTranslations } from "next-intl";

import { ErrorScreen } from "@/components/system/error-screen";

const ERROR_REF_LENGTH = 8;

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("system.error");
  const ref = error.digest?.slice(0, ERROR_REF_LENGTH);

  return (
    <ErrorScreen
      strings={{
        title: t("title"),
        description: t("description"),
        reference: t("reference", { ref: ref ?? "" }),
        reload: t("reload"),
        backToDashboard: t("backToDashboard"),
      }}
      errorRef={ref}
      onReload={reset}
    />
  );
}
