import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type AppColors } from '../theme/colors';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: AppColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
}

const STORAGE_KEY = 'dashboardapp.theme_mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active) return;
        if (value === 'light' || value === 'dark') {
          setModeState(value);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const setMode = async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
  };

  const toggleMode = async () => {
    await setMode(mode === 'light' ? 'dark' : 'light');
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      setMode,
      toggleMode,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }

  return context;
}
