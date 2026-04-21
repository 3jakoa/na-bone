import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useColorScheme } from "nativewind";

export type ThemePref = "light" | "dark" | "system";

const STABLE_THEME: "light" = "light";

type ThemeContextValue = {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  /** "light" | "dark" — the effective scheme after resolving "system". */
  scheme: "light" | "dark";
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useColorScheme();

  // Theme switching is temporarily disabled. Keep one stable app theme until
  // the NativeWind class-based switching flow is reliable enough to expose.
  function applyStableScheme() {
    try {
      setColorScheme(STABLE_THEME);
    } catch (e) {
      console.warn(
        "[theme] forcing the app theme to light failed — NativeWind is probably running on a stale CSS bundle. " +
          "Stop Metro and restart with `npx expo start --clear`, or do a full native rebuild.",
        e
      );
    }
  }

  useEffect(() => {
    applyStableScheme();
  }, [setColorScheme]);

  function setPref(_: ThemePref) {
    applyStableScheme();
  }

  return (
    <ThemeContext.Provider
      value={{
        pref: STABLE_THEME,
        setPref,
        scheme: STABLE_THEME,
        ready: true,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
