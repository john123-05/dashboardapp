import { DynamicColorIOS, Platform } from 'react-native';

// Hell und dunkel: iOS wechselt diese Farben selbst, wenn das System (oder die App-Einstellung) umschaltet.
const dyn = (light: string, dark: string) => (Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : light) as unknown as string;

// Farben aus dem Web-Dashboard (index.css / tailwind brand). Hell, ruhig, Akzent Orange.
export const colors = {
  bg: dyn('#F3F5F8', '#000000'),
  card: dyn('#FFFFFF', '#1C1C1E'),
  ink: dyn('#101828', '#F2F2F7'),
  ink2: dyn('#475467', '#AEAEB2'),
  ink3: dyn('#98A2B3', '#6E6E73'),
  line: dyn('rgba(16, 24, 40, 0.08)', 'rgba(255, 255, 255, 0.08)'),
  lineStrong: dyn('rgba(16, 24, 40, 0.14)', 'rgba(255, 255, 255, 0.16)'),
  // Leichte Füllung für Umschalter, Kästchen, neutrale Abzeichen.
  fill: dyn('rgba(16, 24, 40, 0.06)', 'rgba(255, 255, 255, 0.10)'),
  subtle: dyn('#F7F8FA', '#2C2C2E'),
  sheet: dyn('#EEF0F3', '#111113'),
  brand: '#D2561A',
  brandDark: '#C2410C',
  brandSoft: dyn('#FFF1E8', 'rgba(210, 86, 26, 0.20)'),
  ok: '#12A15F',
  okSoft: dyn('#E6F6EE', 'rgba(18, 161, 95, 0.20)'),
  warn: '#E08A00',
  warnSoft: dyn('#FFF4DB', 'rgba(224, 138, 0, 0.20)'),
  err: '#E5392D',
  errSoft: dyn('#FDEAE8', 'rgba(229, 57, 45, 0.20)'),
  info: '#2E7CF6',
  infoSoft: dyn('#E8F0FE', 'rgba(46, 124, 246, 0.22)'),
  // "white" ist die Kartenfläche (dunkel im Dunkelmodus). Weiße Schrift auf Farbe: onBrand.
  white: dyn('#FFFFFF', '#1C1C1E'),
  onBrand: '#FFFFFF',
  // Für Diagramme (SVG braucht feste Farben).
  chartLine: 'rgba(128, 132, 145, 0.35)',
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
