import QRCode from 'qrcode';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

// QR-Code als SVG, ohne Bild-Umweg: dunkle Module als ein Pfad, immer schwarz auf weiß (auch im
// Dunkelmodus, sonst lesen manche Kameras ihn nicht).
export function QrCode({ value, size = 180, margin = 2 }: { value: string; size?: number; margin?: number }) {
  const { path, count } = useMemo(() => {
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
      const n = qr.modules.size;
      let d = '';
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (qr.modules.get(x, y)) d += `M${x + margin} ${y + margin}h1v1h-1z`;
        }
      }
      return { path: d, count: n + margin * 2 };
    } catch {
      return { path: '', count: 1 };
    }
  }, [value, margin]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel="QR-Code">
      <Rect x={0} y={0} width={count} height={count} fill="#FFFFFF" />
      {path ? <Path d={path} fill="#000000" /> : null}
    </Svg>
  );
}
