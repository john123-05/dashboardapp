import { useState } from 'react';
import { Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';
import { colors, font, space } from '../theme';
import { tapHaptic } from './haptics';

export interface BarPoint {
  label: string;
  value: number;
  caption: string;
}

// Säulendiagramm: antippen oder darüber ziehen zeigt den Wert des Tages. Nur Zahlen, keine Animation
// auf dem JS-Thread, deshalb ruckelfrei.
export function BarChart({ data, height = 150, color = colors.brand, format }: { data: BarPoint[]; height?: number; color?: string; format: (v: number) => string }) {
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = n > 20 ? 2 : 4;
  const bw = width > 0 && n > 0 ? Math.max(2, (width - gap * (n - 1)) / n) : 0;
  const active = sel ?? n - 1;

  const pick = (x: number) => {
    if (!width || !n) return;
    const i = Math.min(n - 1, Math.max(0, Math.floor((x / width) * n)));
    setSel((prev) => {
      if (prev !== i) tapHaptic();
      return i;
    });
  };
  // Antippen wählt einen Tag. Wischen über das Diagramm blättert weiter zwischen den Tabs, nur nach
  // kurzem Halten (Long-Press) wandert die Auswahl mit dem Finger.
  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onUpdate((e) => runOnJS(pick)(e.x));
  const tap = Gesture.Tap().onEnd((e) => runOnJS(pick)(e.x));

  if (n === 0) return null;
  const h = height - 22;
  return (
    <View>
      <View style={{ minHeight: 40, marginBottom: space.sm }}>
        <Text style={{ ...font.title, color: colors.ink, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {format(data[active].value)}
        </Text>
        <Text style={{ ...font.footnote, color: colors.ink2 }} numberOfLines={1}>
          {data[active].caption}
        </Text>
      </View>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              <Line x1={0} x2={width} y1={h} y2={h} stroke={colors.lineStrong} strokeWidth={1} />
              {data.map((d, i) => {
                const bh = Math.max(d.value > 0 ? 3 : 1, (d.value / max) * (h - 4));
                return <Rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={Math.min(4, bw / 2)} fill={i === active ? color : `${color}55`} />;
              })}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -16 }}>
        <Text style={{ ...font.caption, color: colors.ink3 }}>{data[0].label}</Text>
        <Text style={{ ...font.caption, color: colors.ink3 }}>{data[n - 1].label}</Text>
      </View>
    </View>
  );
}
