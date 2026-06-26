import { Library } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export async function Onboarding() {
  const t = await getTranslations("dashboard.onboarding");

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
          <Library className="size-6" strokeWidth={1.8} />
        </div>
        <h2 className="font-heading mt-4 text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t("body")}</p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Step
            index={1}
            active
            title={t("step1Title")}
            body={t("step1Body")}
            action={
              <Button asChild size="sm">
                <Link href="/documents">{t("step1Cta")}</Link>
              </Button>
            }
          />
          <Step index={2} title={t("step2Title")} body={t("step2Body")} />
          <Step index={3} title={t("step3Title")} body={t("step3Body")} />
        </div>
      </div>
    </div>
  );
}

function Step({
  index,
  title,
  body,
  active = false,
  action,
}: {
  index: number;
  title: string;
  body: string;
  active?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "flex-row items-center gap-3.5 px-4 py-3.5",
        !active && "ring-border opacity-65",
      )}
    >
      <span
        className={cn(
          "flex size-[26px] shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{body}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Card>
  );
}
