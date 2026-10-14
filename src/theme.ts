import { Platform } from 'react-native';

// Farben aus dem Web-Dashboard (index.css / tailwind brand). Hell, ruhig, Akzent Orange.
export const colors = {
  bg: '#F3F5F8',
  card: '#FFFFFF',
  ink: '#101828',
  ink2: '#475467',
  ink3: '#98A2B3',
  line: 'rgba(16, 24, 40, 0.08)',
  lineStrong: 'rgba(16, 24, 40, 0.14)',
  brand: '#D2561A',
  brandDark: '#C2410C',
  brandSoft: '#FFF1E8',
  ok: '#12A15F',
  okSoft: '#E6F6EE',
  warn: '#E08A00',
  warnSoft: '#FFF4DB',
  err: '#E5392D',
  errSoft: '#FDEAE8',
  info: '#2E7CF6',
  infoSoft: '#E8F0FE',
  white: '#FFFFFF',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

// Mindestgrösse einer Tippfläche (Apple HIG: 44 x 44 pt).
export const TAP = 44;

// Schriftgrössen nach iOS-Textstilen. Zahlen immer mit gleich breiten Ziffern, damit nichts springt.
export const font = {
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500' as const },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  kpi: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.5, fontVariant: ['tabular-nums'] as ['tabular-nums'] },
};

export const shadow = Platform.select({
  ios: { shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 },
});

export const HEADER_HEIGHT = 44;
