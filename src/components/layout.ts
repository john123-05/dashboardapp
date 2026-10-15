import { useWindowDimensions } from 'react-native';

// Ab 900 pt Breite (iPad quer, Mac) sieht die App aus wie das Web-Dashboard: Seitenleiste links
// statt Tab-Leiste unten.
export const WIDE_BREAKPOINT = 900;
export function useWide() {
  const { width } = useWindowDimensions();
  return width >= WIDE_BREAKPOINT;
}
