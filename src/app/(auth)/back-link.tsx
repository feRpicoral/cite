import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-primary inline-flex items-center justify-center gap-1.5 text-sm font-semibold hover:underline"
    >
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  );
}
