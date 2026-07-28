import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  settingsGet,
  settingsUpdate,
  type ThemePreference,
} from "../ipc";
import {
  applyResolvedTheme,
  parseThemePreference,
  writeCachedThemePreference,
  type ResolvedTheme,
} from "../shared/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  ready: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false,
  );
  const [ready, setReady] = useState(false);

  const resolved = useMemo<ResolvedTheme>(() => {
    if (preference === "light") return "light";
    if (preference === "dark") return "dark";
    return systemDark ? "dark" : "light";
  }, [preference, systemDark]);

  useEffect(() => {
    applyResolvedTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await settingsGet();
        if (cancelled) return;
        const next = parseThemePreference(settings.theme_preference);
        setPreferenceState(next);
        writeCachedThemePreference(next);
      } catch {
        // Keep bootstrap / default preference if settings fail to load.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    const settings = await settingsUpdate({ theme_preference: next });
    const parsed = parseThemePreference(settings.theme_preference);
    setPreferenceState(parsed);
    writeCachedThemePreference(parsed);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, ready, setPreference }),
    [preference, resolved, ready, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
