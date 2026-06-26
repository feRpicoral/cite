import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  subtitle,
  centered = false,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("py-6 shadow-sm", centered && "text-center")}>
      {(title || subtitle) && (
        <CardHeader className="gap-1.5">
          {title && <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>}
          {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        </CardHeader>
      )}
      <CardContent className={cn(centered && "flex flex-col items-center")}>{children}</CardContent>
    </Card>
  );
}
