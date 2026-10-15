import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { usePark } from '../contexts/ParkContext';
import { PREVIEW } from '../lib/preview';
import {
  bucketPurchasesByHour, daysAgoInTimezone, fetchKioskPhotosForDay, fetchRideSnapshots, getOpeningHourRangeForDate, ridesByHour, todayInTimezone,
} from '../lib/kioskSales';
import { formatPercent } from '../lib/format';
import { useData } from '../lib/useData';
import { colors, font, space } from '../theme';
import { tapHaptic } from './haptics';
import { Card, Segmented, Skeleton } from './ui';

const RIDE = '#3B82F6';
const SALE = '#F97316';

type Hour = { hour: number; rides: number; sold: number };

async function loadHours(parkId: string, day: string, tz: string, priceCents: number, range: { startHour: number; endHour: number } | null): Promise<Hour[]> {
  if (PREVIEW) {
    const base = [2, 8, 14, 22, 30, 26, 19, 24, 31, 18, 9, 3];
    return base.map((r, i) => ({ hour: 9 + i, rides: r * 3, sold: Math.round(r / 6) }));
  }
  const [snaps, photos] = await Promise.all([fetchRideSnapshots(parkId, day), fetchKioskPhotosForDay(parkId, day).catch(() => null)]);
  const rides = ridesByHour(snaps, tz);
  const sold = bucketPurchasesByHour((photos?.purchases ?? []), priceCents, tz, range ?? { startHour: 8, endHour: 20 });
  return sold.map((b) => ({ hour: b.hour, rides: rides.get(b.hour) ?? 0, sold: b.soldCount }));
}

// Stoßzeiten wie auf der Übersicht im Dashboard: Fahrten und Fotoverkäufe je Stunde, Heute oder Gestern.
// Antippen einer Stunde zeigt Fahrten, Verkäufe und die Kaufquote dieser Stunde.
export function RushHours() {
  const { parkId, timezone, priceCents, openingHours, openingHoursConfig } = usePark();
  const [tag, setTag] = useState<'heute' | 'gestern'>('heute');
  const day = tag === 'heute' ? todayInTimezone(timezone) : daysAgoInTimezone(timezone, 1);
  const range = getOpeningHourRangeForDate(openingHours, day, openingHoursConfig);
  const data = useData(parkId ? `rush:${parkId}:${day}` : null, () => loadHours(parkId!, day, timezone, priceCents ?? 0, range), [parkId, day], 120000);
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const hours = data.data ?? [];
  const max = Math.max(1, ...hours.map((h) => Math.max(h.rides, h.sold)));
  const totals = useMemo(() => hours.reduce((a, h) => ({ rides: a.rides + h.rides, sold: a.sold + h.sold }), { rides: 0, sold: 0 }), [hours]);
  const peak = hours.reduce<Hour | null>((a, h) => (!a || h.rides > a.rides ? h : a), null);
  const active = sel !== null ? hours[sel] : null;
  const H = 130;
  const slot = hours.length ? w / hours.length : 0;
  const bw = Math.max(3, Math.min(12, slot / 2 - 2));

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ ...font.headline, color: colors.ink }}>Stoßzeiten</Text>
        <View style={{ width: 170 }}>
          <Segmented value={tag} onChange={(v) => { setTag(v); setSel(null); }} options={[{ value: 'heute', label: 'Heute' }, { value: 'gestern', label: 'Gestern' }]} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <Stat color={RIDE} label="Fahrten" value={active ? active.rides : totals.rides} />
        <Stat color={SALE} label="Verkäufe" value={active ? active.sold : totals.sold} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...font.caption, color: colors.ink3 }} numberOfLines={1}>Kaufquote</Text>
          <Text style={{ ...font.headline, color: colors.ink, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
            {formatPercent((active ? active.rides : totals.rides) > 0 ? (active ? active.sold / active.rides : totals.sold / totals.rides) : null)}
          </Text>
        </View>
      </View>
      <Text style={{ ...font.footnote, color: colors.ink2, marginTop: -6 }} numberOfLines={1}>
        {active ? `${String(active.hour).padStart(2, '0')}:00 bis ${String(active.hour + 1).padStart(2, '0')}:00 Uhr` : peak && peak.rides > 0 ? `Meiste Fahrten um ${String(peak.hour).padStart(2, '0')}:00 Uhr` : 'Antippen zeigt die Stunde'}
      </Text>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height: H + 18 }}>
        {data.loading && !data.data ? (
          <Skeleton height={H} radius={10} />
        ) : w > 0 && hours.length > 0 ? (
          <>
            <Svg width={w} height={H}>
              <Line x1={0} x2={w} y1={H - 1} y2={H - 1} stroke={colors.chartLine} />
              {hours.map((h, i) => {
                const x = i * slot + slot / 2;
                const rh = (h.rides / max) * (H - 6);
                const sh = (h.sold / max) * (H - 6);
                const dim = sel !== null && sel !== i ? 0.35 : 1;
                return [
                  <Rect key={`r${i}`} x={x - bw - 1} y={H - 1 - rh} width={bw} height={Math.max(rh, h.rides ? 2 : 0)} rx={2} fill={RIDE} opacity={dim} />,
                  <Rect key={`s${i}`} x={x + 1} y={H - 1 - sh} width={bw} height={Math.max(sh, h.sold ? 2 : 0)} rx={2} fill={SALE} opacity={dim} />,
                ];
              })}
            </Svg>
            <View style={{ position: 'absolute', left: 0, top: 0, width: w, height: H, flexDirection: 'row' }}>
              {hours.map((h, i) => (
                <Pressable key={h.hour} style={{ flex: 1 }} onPress={() => { tapHaptic(); setSel(sel === i ? null : i); }} accessibilityLabel={`${h.hour} Uhr`} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ ...font.caption, color: colors.ink3 }}>{String(hours[0].hour).padStart(2, '0')}:00</Text>
              <Text style={{ ...font.caption, color: colors.ink3 }}>{String(hours[hours.length - 1].hour).padStart(2, '0')}:00</Text>
            </View>
          </>
        ) : null}
      </View>
    </Card>
  );
}

function Stat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
        <Text style={{ ...font.caption, color: colors.ink3 }}>{label}</Text>
      </View>
      <Text style={{ ...font.headline, color: colors.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
