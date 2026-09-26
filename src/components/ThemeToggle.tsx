"use client";

import { useEffect, useState } from "react";
import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  readThemePreference,
  resolveTheme,
  type ThemePreference
} from "@/lib/theme";

const CYCLE: ThemePreference[] = ["system", "light", "dark"];

const LABEL: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark"
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const pref = readThemePreference();
    setPreference(pref);
    applyThemePreference(pref);
    setReady(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      const current = readThemePreference();
      if (current === "system") applyThemePreference("system");
    };
    mq.addEventListener("change", onSystem);
    return () => mq.removeEventListener("change", onSystem);
  }, []);

  function choose(next: ThemePreference) {
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyThemePreference(next);
  }

  function cycle() {
    const i = CYCLE.indexOf(preference);
    choose(CYCLE[(i + 1) % CYCLE.length]);
  }

  const resolved = ready ? resolveTheme(preference) : "light";

  return (
    <button
      type="button"
      onClick={cycle}
      className={`btn-ghost px-3 py-2 ${className}`}
      title={`Theme: ${LABEL[preference]} (click to change)`}
      aria-label={`Theme ${LABEL[preference]}, currently ${resolved}. Click to change.`}
    >
      {preference === "system" ? <SystemIcon /> : resolved === "dark" ? <MoonIcon /> : <SunIcon />}
      <span className="hidden sm:inline">{LABEL[preference]}</span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M12.8 3.2l-1.1 1.1M4.3 11.7l-1.1 1.1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12.8 9.2A5.5 5.5 0 0 1 6.8 3.2 5.6 5.6 0 1 0 12.8 9.2Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="8.5" rx="1.5" />
      <path d="M6 14h4M8 11.5V14" />
    </svg>
  );
}
