import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Appearance } from 'react-native';

// Hell, Dunkel oder wie das Gerät. Standard ist Hell, wie das Web-Dashboard. Umschalten über
// Appearance.setColorScheme: iOS färbt dann alle dynamischen Farben (theme.ts) sofort um.
export type Look = 'light' | 'dark' | 'system';
export const APPEARANCE_KEY = 'lp-appearance';

export function applyAppearance(v: string | null) {
  // Im Browser (Vorschau) gibt es setColorScheme nicht.
  Appearance.setColorScheme?.(v === 'dark' ? 'dark' : v === 'system' ? null : 'light');
}

const Ctx = createContext<{ look: Look; setLook: (l: Look) => void; isDark: boolean; toggle: () => void } | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [look, setLookState] = useState<Look>('light');
  const [system, setSystem] = useState(Appearance.getColorScheme());
  useEffect(() => {
    const forced = process.env.EXPO_PUBLIC_PREVIEW_LOOK as Look | undefined;
    if (forced) {
      setLookState(forced);
      applyAppearance(forced);
      return;
    }
    void AsyncStorage.getItem(APPEARANCE_KEY).then((v) => {
      const l = (v === 'dark' || v === 'system' ? v : 'light') as Look;
      setLookState(l);
      applyAppearance(l);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme));
    return () => sub.remove();
  }, []);
  const setLook = (l: Look) => {
    setLookState(l);
    applyAppearance(l);
    void AsyncStorage.setItem(APPEARANCE_KEY, l);
  };
  const isDark = look === 'dark' || (look === 'system' && system === 'dark');
  return <Ctx.Provider value={{ look, setLook, isDark, toggle: () => setLook(isDark ? 'light' : 'dark') }}>{children}</Ctx.Provider>;
}

export function useLook() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLook außerhalb von AppearanceProvider');
  return c;
}
