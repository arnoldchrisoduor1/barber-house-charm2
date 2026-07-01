"use client";

import { useEffect } from "react";

import { resolveInitialTheme, useUIStore } from "@/lib/store/ui-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const stored = localStorage.getItem("haus-ui");
    if (!stored) {
      setTheme(resolveInitialTheme());
    }
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  return <>{children}</>;
}
