"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LoadMore({ nextTake, label }: { nextTake: number; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const params = new URLSearchParams(searchParams);
    params.set("take", String(nextTake));
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {label}
    </Button>
  );
}
