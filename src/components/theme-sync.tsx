"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * One-way sync from the DB-persisted theme preference into next-themes'
 * localStorage. Runs once per browser session so the user's saved choice
 * follows them across devices on first load. Subsequent toggles persist
 * via `setUserThemeAction`; we deliberately don't react to `initial`
 * changes after the first mount because that would clobber the toggle's
 * fresh value with whatever the prior render's DB read returned.
 */
export function ThemeSync({ initial }: { initial: "light" | "dark" | "system" }) {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    setTheme(initial);
  }, [initial, setTheme]);

  return null;
}
