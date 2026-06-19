import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type ColorMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ColorMode;
  resolvedScheme: "light" | "dark";
  setMode: (m: ColorMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolvedScheme: "light",
  isDark: false,
  setMode: () => {},
});

const STORAGE_KEY = "parkease_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ColorMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = useCallback((m: ColorMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  const resolvedScheme: "light" | "dark" =
    mode === "system" ? (systemScheme ?? "light") : mode;

  return (
    <ThemeContext.Provider value={{ mode, resolvedScheme, isDark: resolvedScheme === "dark", setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
