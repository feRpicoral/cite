"use client";

import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";

import { cn } from "@/lib/utils";

const ERROR_REF_LENGTH = 8;
const THEME_STORAGE_KEY = "theme";

const STRINGS = {
  "en-US": {
    title: "Something went wrong",
    description:
      "An unexpected error occurred and our team has been notified. Try reloading — your work is saved.",
    reload: "Reload",
    backToDashboard: "Back to dashboard",
  },
  "pt-BR": {
    title: "Algo deu errado",
    description:
      "Ocorreu um erro inesperado e nossa equipe foi avisada. Tente recarregar — seu trabalho está salvo.",
    reload: "Recarregar",
    backToDashboard: "Voltar ao painel",
  },
} as const;

type SupportedLang = keyof typeof STRINGS;

function documentLang() {
  if (typeof document === "undefined") return "en-US";
  return document.documentElement.lang || "en-US";
}

function pickStrings(lang: string) {
  if (lang in STRINGS) return STRINGS[lang as SupportedLang];
  return STRINGS["en-US"];
}

function prefersDark() {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang = documentLang();
  const strings = pickStrings(lang);
  const ref = error.digest?.slice(0, ERROR_REF_LENGTH);

  return (
    <html lang={lang} className={prefersDark() ? "dark" : undefined} suppressHydrationWarning>
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          "bg-background text-foreground min-h-screen font-sans antialiased",
        )}
      >
        <div className="flex min-h-svh flex-col items-center justify-center px-6 py-12">
          <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-xl">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3 L22 20 L2 20 Z" />
              <line x1="12" y1="9" x2="12" y2="14" />
              <circle cx="12" cy="17" r="0.6" fill="currentColor" />
            </svg>
          </div>
          <h1 className="font-heading mt-4 text-lg font-semibold">{strings.title}</h1>
          <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm leading-relaxed">
            {strings.description}
          </p>
          {ref && (
            <p className="text-muted-foreground/80 mt-2.5 font-mono text-xs">error_ref · {ref}</p>
          )}
          <div className="mt-5 flex w-full max-w-xs flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="bg-primary text-primary-foreground inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12 a9 9 0 1 1 -2.6 -6.3" />
                <polyline points="21 4 21 9 16 9" />
              </svg>
              {strings.reload}
            </button>
            <Link
              href="/dashboard"
              className="border-border bg-background hover:bg-muted inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors"
            >
              {strings.backToDashboard}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
