"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * One-way sync from the DB-persisted theme preference into next-themes'
 * localStorage on mount. After mount, the user's clicks on the toggle drive
 * the local state, and the server action that persists is responsible for
 * writing back to the DB.
 */
export function ThemeSync({ initial }: { initial: "light" | "dark" | "system" }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(initial);
  }, [initial, setTheme]);

  return null;
}
