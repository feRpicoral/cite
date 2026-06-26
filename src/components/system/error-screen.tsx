"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";

import { SystemScreen } from "@/components/system/system-screen";
import { Button } from "@/components/ui/button";

export interface ErrorScreenStrings {
  title: string;
  description: string;
  reference: string;
  reload: string;
  backToDashboard: string;
}

export function ErrorScreen({
  strings,
  errorRef,
  onReload,
}: {
  strings: ErrorScreenStrings;
  errorRef?: string;
  onReload: () => void;
}) {
  return (
    <SystemScreen>
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-xl">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="font-heading mt-4 text-lg font-semibold">{strings.title}</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm leading-relaxed">
        {strings.description}
      </p>
      {errorRef && (
        <p className="text-muted-foreground/80 mt-2.5 font-mono text-xs">{strings.reference}</p>
      )}
      <div className="mt-5 flex w-full max-w-xs flex-col gap-2 sm:w-auto sm:flex-row">
        <Button size="lg" onClick={onReload}>
          <RotateCcw />
          {strings.reload}
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard">{strings.backToDashboard}</Link>
        </Button>
      </div>
    </SystemScreen>
  );
}
