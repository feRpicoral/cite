import { Mail } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { BackLink } from "../../back-link";
import { StatusCard } from "../../status-card";
import { ResendButton } from "./resend-button";

interface CheckEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const { email } = await searchParams;
  const t = await getTranslations("auth.checkEmail");

  return (
    <div className="space-y-4">
      <StatusCard
        icon={<Mail />}
        title={t("title")}
        description={
          email
            ? t.rich("body", {
                email,
                strong: (chunks) => <span className="text-foreground font-semibold">{chunks}</span>,
              })
            : t("bodyGeneric")
        }
      >
        {email && <ResendButton email={email} />}
        <p className="text-muted-foreground text-xs">
          {t("spamHint")}{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            {t("useDifferentEmail")}
          </Link>
          .
        </p>
      </StatusCard>
      <div className="text-center">
        <BackLink href="/login">{t("backToSignIn")}</BackLink>
      </div>
    </div>
  );
}
