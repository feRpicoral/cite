import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE: Record<"primary" | "warning" | "destructive", string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
};

export function StatusCard({
  icon,
  tone = "primary",
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  tone?: "primary" | "warning" | "destructive";
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="py-6 text-center shadow-sm">
      <CardHeader className="items-center gap-1.5">
        <div
          className={cn(
            "mx-auto mb-2 flex size-12 items-center justify-center rounded-xl [&_svg]:size-6",
            TONE[tone],
          )}
        >
          {icon}
        </div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        )}
      </CardHeader>
      {children && (
        <CardContent className="flex flex-col items-center gap-3">{children}</CardContent>
      )}
    </Card>
  );
}
