import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Highlighter,
  LifeBuoy,
  LockKeyhole,
  type LucideIcon,
  MousePointerClick,
  Quote,
  Scale,
  Search,
  ShieldCheck,
  SquarePen,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type Locale, localeUrlSlug, slugToLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

import { MarketingFooter } from "./_components/marketing-footer";
import { MarketingNav } from "./_components/marketing-nav";

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: slug } = await params;
  const locale = slugToLocale(slug);
  if (!locale) notFound();
  setRequestLocale(locale);
  const home = `/${localeUrlSlug[locale]}`;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <MarketingNav locale={locale} home={home} />
      <main>
        <Hero locale={locale} home={home} />
        <Stats locale={locale} />
        <HowItWorks locale={locale} />
        <Retrieval locale={locale} />
        <Viewer locale={locale} />
        <Audit locale={locale} />
        <Collaboration locale={locale} />
        <FeatureGrid locale={locale} />
        <UseCases locale={locale} />
        <Faq locale={locale} />
        <ClosingCta locale={locale} />
      </main>
      <MarketingFooter locale={locale} home={home} />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-primary font-mono text-[11px] font-semibold tracking-widest uppercase">
      {children}
    </div>
  );
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Check className="text-success size-4 shrink-0" strokeWidth={2.6} />
      <span className="text-foreground/80 text-sm font-medium">{children}</span>
    </div>
  );
}

async function Hero({ locale, home }: { locale: Locale; home: string }) {
  const t = await getTranslations({ locale, namespace: "landing.hero" });

  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-primary/10 pointer-events-none absolute top-[-220px] left-1/2 h-[620px] w-[1100px] max-w-[120vw] -translate-x-1/2 rounded-full blur-3xl"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pt-20 text-center">
        <Badge variant="outline" className="bg-card gap-2 px-3 py-1.5 font-mono shadow-sm">
          <span className="bg-primary size-1.5 rounded-full" />
          <span className="text-[11px] tracking-wider uppercase">{t("badge")}</span>
        </Badge>
        <h1 className="mt-6 max-w-3xl text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.04] font-semibold tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-balance">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/signup">{t("ctaPrimary")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-5 text-base">
            <Link href={`${home}#how`}>
              {t("ctaSecondary")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground mt-4 text-sm font-medium">{t("note")}</p>

        <HeroDemo locale={locale} />
      </div>
    </section>
  );
}

async function HeroDemo({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.hero" });

  return (
    <div className="relative mx-auto mt-14 w-full max-w-4xl">
      <Card className="overflow-hidden p-0 shadow-2xl">
        <div className="flex h-10 items-center gap-2 border-b px-4">
          <span className="bg-destructive/60 size-2.5 rounded-full" />
          <span className="bg-warning/60 size-2.5 rounded-full" />
          <span className="bg-success/60 size-2.5 rounded-full" />
          <span className="text-muted-foreground ml-2.5 font-mono text-[11px]">
            {t("demoTitle")}
          </span>
        </div>
        <div className="flex flex-wrap gap-7 p-8 text-left">
          <div className="min-w-0 flex-1 basis-80">
            <div className="mb-3.5 flex justify-end">
              <div className="bg-primary text-primary-foreground max-w-80 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed">
                {t("demoQuestion")}
              </div>
            </div>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="bg-foreground text-background flex size-5.5 items-center justify-center rounded-md font-mono text-[11px] font-semibold">
                C
              </span>
              <span className="text-sm font-semibold">Cite</span>
            </div>
            <div className="bg-muted/60 rounded-2xl rounded-bl-sm border px-4 py-3.5 text-[0.95rem] leading-relaxed">
              {t("demoAnswerLead")} <strong className="font-semibold">{t("demoAnswerDays")}</strong>{" "}
              {t("demoAnswerMid")}
              <CitationChip n={1} tone="amber" />
              {t("demoAnswerTail")}
              <CitationChip n={2} tone="primary" />.
            </div>
          </div>
          <div className="min-w-50 flex-1 basis-56 border-l pl-5.5">
            <div className="text-muted-foreground mb-3 font-mono text-[9px] font-semibold tracking-widest uppercase">
              {t("demoSourceLabel")}
            </div>
            <div className="text-foreground border-warning rounded-r-md border-l-2 bg-[var(--highlight)]/45 px-3 py-2.5 text-xs leading-relaxed">
              {t("demoSourceQuote")}
            </div>
            <div className="text-success mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold">
              <Check className="size-3" strokeWidth={3} />
              {t("demoVerdict")}
            </div>
          </div>
        </div>
      </Card>

      <FloatingCard
        className="absolute -top-6 -right-5 hidden sm:flex"
        icon={MousePointerClick}
        tone="amber"
        title={t("floatClickTitle")}
        body={t("floatClickBody")}
      />
      <FloatingCard
        className="absolute -bottom-6 -left-5 hidden sm:flex"
        icon={ShieldCheck}
        tone="success"
        title={t("floatAuditTitle")}
        body={t("floatAuditBody")}
      />
    </div>
  );
}

function CitationChip({ n, tone }: { n: number; tone: "amber" | "primary" }) {
  return (
    <span
      className={cn(
        "mx-0.5 inline-flex h-4.5 items-center rounded-[5px] border px-1.5 align-baseline font-mono text-[10px] font-semibold",
        tone === "amber"
          ? "border-warning/50 text-warning bg-[var(--highlight)]/60"
          : "bg-primary/10 border-primary/30 text-primary",
      )}
    >
      {n}
    </span>
  );
}

function FloatingCard({
  className,
  icon: Icon,
  tone,
  title,
  body,
}: {
  className?: string;
  icon: LucideIcon;
  tone: "amber" | "success";
  title: string;
  body: string;
}) {
  return (
    <Card className={cn("flex-row items-center gap-2.5 p-3 shadow-xl", className)}>
      <span
        className={cn(
          "flex size-7.5 items-center justify-center rounded-lg",
          tone === "amber" ? "text-warning bg-[var(--highlight)]/60" : "bg-success/15 text-success",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div>
        <div className="text-sm leading-tight font-semibold">{title}</div>
        <div className="text-muted-foreground text-[11px] leading-tight">{body}</div>
      </div>
    </Card>
  );
}

async function Stats({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.stats" });
  const items = [
    { value: t("supportedValue"), label: t("supportedLabel"), accent: true },
    { value: t("verifiedValue"), label: t("verifiedLabel") },
    { value: t("latencyValue"), label: t("latencyLabel") },
    { value: t("formatsValue"), label: t("formatsLabel") },
  ];

  return (
    <section className="mx-auto mt-22 max-w-6xl px-6">
      <div className="flex flex-wrap justify-between gap-6 border-y py-7">
        {items.map((item) => (
          <div key={item.label} className="flex-1 basis-48">
            <div
              className={cn(
                "text-[clamp(1.75rem,4vw,2.375rem)] leading-none font-semibold tracking-tight",
                item.accent ? "text-success" : "text-foreground",
              )}
            >
              {item.value}
            </div>
            <div className="text-muted-foreground mt-1.5 text-sm font-medium">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function HowItWorks({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.how" });
  const steps = [
    { n: "01", icon: Upload, title: t("step1Title"), body: t("step1Body"), tone: "primary" },
    { n: "02", icon: SquarePen, title: t("step2Title"), body: t("step2Body"), tone: "primary" },
    { n: "03", icon: Quote, title: t("step3Title"), body: t("step3Body"), tone: "amber" },
    { n: "04", icon: ShieldCheck, title: t("step4Title"), body: t("step4Body"), tone: "success" },
  ] as const;

  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-6 pt-25">
      <div className="text-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 className="mt-3.5 text-[clamp(1.75rem,4.2vw,2.75rem)] leading-tight font-semibold tracking-tight text-balance">
          {t("title")}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3.5 max-w-xl text-base leading-relaxed text-balance">
          {t("subtitle")}
        </p>
      </div>
      <div className="mt-12 flex flex-wrap gap-5">
        {steps.map((step) => (
          <Card key={step.n} className="flex-1 basis-56 gap-0 p-6">
            <div className="mb-4 flex items-center justify-between">
              <span
                className={cn(
                  "flex size-9.5 items-center justify-center rounded-xl",
                  toneBg(step.tone),
                )}
              >
                <step.icon className="size-5" />
              </span>
              <span className="text-muted-foreground/70 font-mono text-xs font-semibold">
                {step.n}
              </span>
            </div>
            <div className="text-base font-semibold">{step.title}</div>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{step.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function toneBg(tone: "primary" | "amber" | "success") {
  if (tone === "amber") return "bg-[var(--highlight)]/60 text-warning";
  if (tone === "success") return "bg-success/15 text-success";
  return "bg-primary/10 text-primary";
}

function FeatureSection({
  id,
  eyebrow,
  title,
  body,
  points,
  media,
  reverse,
}: {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  points: string[];
  media: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl px-6 pt-26", id && "scroll-mt-20")}>
      <div className="flex flex-wrap items-center gap-14">
        <div className={cn("flex-1 basis-90", reverse && "lg:order-2")}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-3.5 text-[clamp(1.625rem,3.6vw,2.375rem)] leading-tight font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-muted-foreground mt-3.5 max-w-md text-base leading-relaxed">{body}</p>
          <div className="mt-5 flex flex-col gap-3">
            {points.map((point) => (
              <CheckRow key={point}>{point}</CheckRow>
            ))}
          </div>
        </div>
        <div className={cn("min-w-0 flex-1 basis-95", reverse && "lg:order-1")}>{media}</div>
      </div>
    </section>
  );
}

async function Retrieval({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.retrieval" });
  return (
    <FeatureSection
      id="product"
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={t("body")}
      points={[t("point1"), t("point2"), t("point3")]}
      media={<RetrievalMedia locale={locale} />}
    />
  );
}

async function RetrievalMedia({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.retrieval" });
  return (
    <Card className="gap-0 p-5 shadow-xl">
      <div className="mb-3.5 flex items-center gap-2">
        <Search className="text-primary size-3.5" />
        <span className="text-sm font-semibold">{t("demoTitle")}</span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <StepDot done />
          <span className="text-foreground/80 text-[13px] font-medium">{t("demoClassified")}</span>
        </div>
        <div className="flex gap-2.5">
          <StepDot done />
          <div className="flex flex-wrap gap-1.5">
            {[t("demoTag1"), t("demoTag2"), t("demoTag3")].map((tag) => (
              <span
                key={tag}
                className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-[10.5px] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <StepDot done />
          <span className="text-foreground/80 text-[13px] font-medium">{t("demoSearch")}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="border-warning flex size-4.5 items-center justify-center rounded-full border-2">
            <span className="bg-warning size-1.5 animate-pulse rounded-full" />
          </span>
          <span className="text-[13px] font-semibold">{t("demoSynth")}</span>
        </div>
      </div>
    </Card>
  );
}

function StepDot({ done }: { done?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4.5 shrink-0 items-center justify-center rounded-full",
        done ? "bg-success/15 text-success" : "bg-muted",
      )}
    >
      {done ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
    </span>
  );
}

async function Viewer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.viewer" });
  return (
    <FeatureSection
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={t("body")}
      points={[t("point1"), t("point2"), t("point3")]}
      reverse
      media={<ViewerMedia locale={locale} />}
    />
  );
}

async function ViewerMedia({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.viewer" });
  return (
    <Card className="overflow-hidden p-0 shadow-xl">
      <div className="flex h-10 items-center gap-2.5 border-b px-3.5">
        <Badge variant="destructive" className="font-mono text-[9px]">
          PDF
        </Badge>
        <span className="text-sm font-semibold">{t("docName")}</span>
        <span className="text-muted-foreground ml-auto font-mono text-[11px]">{t("docPage")}</span>
      </div>
      <div className="bg-muted/40 flex justify-center p-5.5">
        <div className="bg-card w-full max-w-90 rounded-sm px-7 py-6.5 shadow-md">
          <div className="text-muted-foreground font-mono text-[10px] font-semibold tracking-widest uppercase">
            {t("docHeading")}
          </div>
          <p className="text-muted-foreground mt-3 text-[11px] leading-loose">
            <strong className="text-foreground font-semibold">12.2</strong> {t("docClause2")}
          </p>
          <div className="border-warning text-foreground relative mt-3 rounded-sm border-l-[3px] bg-[var(--highlight)]/60 px-3 py-2.5 text-[11px] leading-loose">
            <span className="bg-warning text-warning-foreground absolute -top-2 -left-2 inline-flex h-4 items-center rounded-[5px] px-1.5 font-mono text-[10px] font-semibold">
              1
            </span>
            <strong className="font-semibold">{t("docHighlightLead")}</strong>{" "}
            {t("docHighlightBody")}
          </div>
          <p className="text-muted-foreground mt-3 text-[11px] leading-loose">
            <strong className="text-foreground font-semibold">12.4</strong> {t("docClause4")}
          </p>
        </div>
      </div>
    </Card>
  );
}

async function Audit({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.audit" });
  return (
    <FeatureSection
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={
        <>
          {t("bodyLead")}{" "}
          <strong className="text-success font-semibold">{t("bodySupported")}</strong>,{" "}
          <strong className="text-warning font-semibold">{t("bodyPartial")}</strong>{" "}
          <strong className="text-destructive font-semibold">{t("bodyUnsupported")}</strong>
          {t("bodyTail")}
        </>
      }
      points={[t("point1"), t("point2"), t("point3")]}
      media={<AuditMedia locale={locale} />}
    />
  );
}

async function AuditMedia({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.audit" });
  return (
    <Card className="gap-0 p-5 shadow-xl">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-sm font-semibold">{t("cardTitle")}</span>
        <span className="text-muted-foreground font-mono text-[11px]">{t("cardAudited")}</span>
      </div>
      <div className="mb-3.5 flex h-2.5 overflow-hidden rounded-full">
        <div className="bg-success" style={{ width: "94%" }} />
        <div className="bg-warning" style={{ width: "4%" }} />
        <div className="bg-destructive" style={{ width: "2%" }} />
      </div>
      <div className="mb-4 flex flex-wrap gap-3.5">
        <Legend className="bg-success" label={t("legendSupported")} />
        <Legend className="bg-warning" label={t("legendPartial")} />
        <Legend className="bg-destructive" label={t("legendUnsupported")} />
      </div>
      <div className="flex items-center gap-2.5 border-t pt-3.5">
        <span className="bg-primary/10 border-primary/30 text-primary inline-flex h-4.5 shrink-0 items-center rounded-[5px] border px-1.5 font-mono text-[10px] font-semibold">
          3
        </span>
        <span className="text-muted-foreground flex-1 text-xs leading-snug">{t("cardReason")}</span>
        <span className="text-warning inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold">
          {t("cardVerdict")}
        </span>
      </div>
    </Card>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-sm", className)} />
      <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
    </div>
  );
}

async function Collaboration({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.collab" });
  return (
    <FeatureSection
      eyebrow={t("eyebrow")}
      title={t("title")}
      body={t("body")}
      points={[t("point1"), t("point2"), t("point3")]}
      reverse
      media={<CollabMedia locale={locale} />}
    />
  );
}

async function CollabMedia({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.collab" });
  return (
    <Card className="gap-0 p-5 shadow-xl">
      <div className="mb-3 flex items-center gap-2">
        <span className="bg-foreground text-background flex size-5.5 items-center justify-center rounded-md font-mono text-[11px] font-semibold">
          C
        </span>
        <span className="text-sm font-semibold">Cite</span>
        <div className="ml-auto flex items-center">
          <Avatar className="bg-chart-2 ring-card ring-2">AL</Avatar>
          <Avatar className="bg-chart-1 ring-card -ml-2 ring-2">JM</Avatar>
        </div>
      </div>
      <div className="bg-muted/60 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed">
        {t("demoMessage")}
        <CitationChip n={1} tone="amber" />.
      </div>
      <div className="mt-3 ml-6">
        <Card className="max-w-64 gap-0 p-3 shadow-lg">
          <div className="flex items-center gap-1.5">
            <Avatar className="bg-chart-2 size-5.5">AL</Avatar>
            <span className="text-[11.5px] font-semibold">{t("demoCommentAuthor")}</span>
            <span className="bg-muted text-foreground rounded px-1.5 py-0.5 text-[8px] font-semibold">
              {t("demoCommentRole")}
            </span>
            <span className="text-muted-foreground ml-auto font-mono text-[9px]">
              {t("demoCommentTime")}
            </span>
          </div>
          <p className="text-foreground/80 mt-1.5 text-xs leading-relaxed">
            {t("demoCommentBody")}
          </p>
        </Card>
      </div>
    </Card>
  );
}

function Avatar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-primary-foreground flex size-6 items-center justify-center rounded-full text-[9px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

async function FeatureGrid({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.features" });
  const items: {
    icon: LucideIcon;
    title: string;
    body: string;
    tone: "primary" | "amber" | "success";
  }[] = [
    { icon: Quote, title: t("inlineTitle"), body: t("inlineBody"), tone: "primary" },
    { icon: Highlighter, title: t("highlightTitle"), body: t("highlightBody"), tone: "amber" },
    { icon: ShieldCheck, title: t("auditTitle"), body: t("auditBody"), tone: "success" },
    { icon: Search, title: t("retrievalTitle"), body: t("retrievalBody"), tone: "primary" },
    { icon: Users, title: t("collabTitle"), body: t("collabBody"), tone: "primary" },
    { icon: LockKeyhole, title: t("workspacesTitle"), body: t("workspacesBody"), tone: "primary" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 pt-26">
      <div className="mb-10 text-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 className="mt-3.5 text-[clamp(1.75rem,4.2vw,2.625rem)] leading-tight font-semibold tracking-tight text-balance">
          {t("title")}
        </h2>
      </div>
      <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="gap-0 p-5.5">
            <span
              className={cn(
                "mb-3.5 flex size-9 items-center justify-center rounded-lg",
                toneBg(item.tone),
              )}
            >
              <item.icon className="size-4.5" />
            </span>
            <div className="text-[15px] font-semibold">{item.title}</div>
            <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">{item.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

async function UseCases({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.useCases" });
  const items: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: Scale, title: t("legalTitle"), body: t("legalBody") },
    { icon: ShieldCheck, title: t("complianceTitle"), body: t("complianceBody") },
    { icon: LifeBuoy, title: t("supportTitle"), body: t("supportBody") },
    { icon: FileText, title: t("researchTitle"), body: t("researchBody") },
  ];

  return (
    <section id="usecases" className="mx-auto max-w-6xl scroll-mt-20 px-6 pt-26">
      <div className="mb-10 text-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 className="mt-3.5 text-[clamp(1.75rem,4.2vw,2.625rem)] leading-tight font-semibold tracking-tight text-balance">
          {t("title")}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3.5 max-w-xl text-base leading-relaxed text-balance">
          {t("subtitle")}
        </p>
      </div>
      <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item.title} className="gap-0 p-6">
            <span className="bg-primary/10 text-primary mb-4 flex size-10 items-center justify-center rounded-xl">
              <item.icon className="size-5" />
            </span>
            <div className="text-base font-semibold">{item.title}</div>
            <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">{item.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

async function Faq({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.faq" });
  const items = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
  ];

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 pt-26">
      <div className="mb-10 text-center">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 className="mt-3.5 text-[clamp(1.75rem,4.2vw,2.625rem)] leading-tight font-semibold tracking-tight">
          {t("title")}
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="group bg-card rounded-xl border px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center text-[15px] font-semibold">
              {item.q}
              <ChevronDown className="text-muted-foreground ml-auto size-4.5 transition-transform group-open:rotate-180" />
            </summary>
            <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

async function ClosingCta({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.cta" });
  return (
    <section className="mx-auto mt-26 max-w-6xl px-6">
      <div className="bg-foreground relative overflow-hidden rounded-3xl px-8 py-18 text-center">
        <div
          aria-hidden
          className="bg-primary/30 pointer-events-none absolute top-[-160px] left-1/2 h-[420px] w-[760px] max-w-full -translate-x-1/2 rounded-full blur-3xl"
        />
        <div className="relative">
          <h2 className="text-background mx-auto max-w-2xl text-[clamp(1.875rem,4.6vw,3rem)] leading-tight font-semibold tracking-tight text-balance">
            {t("title")}
          </h2>
          <p className="text-background/70 mx-auto mt-4 max-w-md text-lg leading-relaxed text-balance">
            {t("subtitle")}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/signup">{t("primary")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-background border-background/20 bg-background/5 hover:bg-background/10 hover:text-background dark:bg-background/5 h-12 px-6 text-base"
            >
              <Link href="/login">{t("secondary")}</Link>
            </Button>
          </div>
          <p className="text-background/55 mt-4 text-sm font-medium">{t("note")}</p>
        </div>
      </div>
    </section>
  );
}
