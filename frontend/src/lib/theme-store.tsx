import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "gamibar-theme";

export const themeInitScript = `(function(){try{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}catch(e){}})();`;

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = "light";
  const isDark = false;
  const setTheme = useCallback(() => {}, []);
  const toggleTheme = useCallback(() => {}, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
