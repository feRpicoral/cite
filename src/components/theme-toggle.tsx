"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTransition } from "react";

import { setUserThemeAction } from "@/components/theme-actions";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const [pending, startTransition] = useTransition();

  const isDark = mounted && resolvedTheme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    // Persist before the layout re-renders so ThemeSync sees the new value
    // and doesn't reset the toggle.
    startTransition(() => {
      void setUserThemeAction(next === "dark" ? "DARK" : "LIGHT");
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      disabled={pending}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
