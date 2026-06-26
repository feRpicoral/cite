"use client";

import { useEffect, useState } from "react";

const STRINGS = {
  "en-US": {
    title: "You're offline",
    description:
      "Check your connection. Cite will reconnect automatically and pick up where you left off.",
    reconnecting: "Reconnecting…",
  },
  "pt-BR": {
    title: "Você está offline",
    description:
      "Verifique sua conexão. O Cite vai reconectar automaticamente e retomar de onde você parou.",
    reconnecting: "Reconectando…",
  },
} as const;

type SupportedLang = keyof typeof STRINGS;

function pickStrings(lang: string) {
  if (lang in STRINGS) return STRINGS[lang as SupportedLang];
  return STRINGS["en-US"];
}

function documentLang() {
  if (typeof document === "undefined") return "en-US";
  return document.documentElement.lang || "en-US";
}

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);
  const [lang] = useState(documentLang);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  const strings = pickStrings(lang);

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={strings.title}
      className="bg-background/95 fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 py-12 backdrop-blur-sm"
    >
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
        <svg
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 1 l22 22 M16.7 16.7 A5 5 0 0 0 12 14 M5 12.5 a10 10 0 0 1 3 -2 M8.5 8.5 a14 14 0 0 1 11 2.5 M12 20 h.01" />
        </svg>
      </div>
      <h2 className="font-heading mt-4 text-lg font-semibold">{strings.title}</h2>
      <p className="text-muted-foreground mt-2 max-w-xs text-center text-sm leading-relaxed">
        {strings.description}
      </p>
      <div className="border-border bg-background mt-5 inline-flex h-9 items-center gap-2 rounded-lg border px-3.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          className="animate-cite-spin"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8"
            className="stroke-primary"
            strokeWidth="3"
            fill="none"
            opacity="0.3"
          />
          <path
            d="M12 4 a8 8 0 0 1 8 8"
            className="stroke-primary"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-muted-foreground text-xs font-medium">{strings.reconnecting}</span>
      </div>
    </div>
  );
}
