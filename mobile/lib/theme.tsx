import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";

export type ThemePref = "light" | "dark" | "system";

const STORAGE_KEY = "theme_pref";

type ThemeContextValue = {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  /** "light" | "dark" — the effective scheme after resolving "system". */
  scheme: "light" | "dark";
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [ready, setReady] = useState(false);

  // Load persisted preference on mount.
  useEffect(() => {
    (async () => {
      try {
        const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as
          | ThemePref
          | null;
        const initial: ThemePref =
          stored === "light" || stored === "dark" || stored === "system"
            ? stored
            : "system";
        setPrefState(initial);
        applyScheme(initial);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NativeWind's setColorScheme throws if the compiled CSS wasn't built with
  // darkMode: "class". That happens when Metro is serving a stale bundle from
  // before tailwind.config.js was updated. Catch it so we don't crash; a
  // clear log tells the user how to fix it.
  function applyScheme(p: ThemePref) {
    try {
      setColorScheme(p);
    } catch (e) {
      console.warn(
        "[theme] setColorScheme failed — NativeWind is probably running on a stale CSS bundle. " +
          "Stop Metro and restart with `npx expo start --clear`, or do a full native rebuild.",
        e
      );
    }
  }

  function setPref(p: ThemePref) {
    setPrefState(p);
    applyScheme(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }

  return (
    <ThemeContext.Provider
      value={{
        pref,
        setPref,
        scheme: colorScheme === "dark" ? "dark" : "light",
        ready,
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
