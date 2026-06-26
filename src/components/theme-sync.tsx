"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * One-way sync from the DB-persisted theme into next-themes localStorage,
 * applied once per session so a saved choice follows the user on first load.
 * Deliberately ignores `initial` changes after the first mount, since reacting
 * to them would clobber the toggle's fresh value with a stale DB read.
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
