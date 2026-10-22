import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Input, Notice, SwitchRow } from '../../components/controls';
import { successHaptic } from '../../components/haptics';
import { Button, Card, ErrorNote, ListCard, Skeleton } from '../../components/ui';
import { fetchTracking, saveTracking, type TrackingSettings } from '../../lib/crm';
import { colors, font, radius, space } from '../../theme';

// Werbe-Pixel wie TrackingManager im Web: Meta-Pixel und Google Ads für die Foto-Abholseite.
export function PixelTab({ parkId }: { parkId: string }) {
  const [s, setS] = useState<TrackingSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTracking(parkId)
      .then(setS)
      .catch((e) => setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen.'));
  }, [parkId]);

  const update = (p: Partial<TrackingSettings>) => {
    setS((c) => (c ? { ...c, ...p } : c));
    setDirty(true);
    setSaved(false);
  };

  async function save() {
    if (!s) return;
    setBusy(true);
    setError(null);
    try {
      setS(await saveTracking(parkId, s));
      setDirty(false);
      setSaved(true);
      successHaptic();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    }
    setBusy(false);
  }

  if (!s) return error ? <ErrorNote text={error} /> : <Skeleton height={200} radius={radius.lg} />;
  return (
    <>
      <Card>
        <Text style={{ ...font.headline, color: colors.ink }}>Werbe-Pixel</Text>
        <Text style={{ ...font.subhead, color: colors.ink2, marginTop: 4 }}>
          Pixel für deine Foto-Abholseite – unabhängig davon, wie Gäste ihr Foto freischalten. Die Tags werden erst geladen, wenn ein Gast Werbe-Tracking zustimmt.
        </Text>
      </Card>
      <ListCard>
        <SwitchRow title="Pixel aktivieren" subtitle="Gilt nach dem Speichern für neue Besuche der Abholseite." value={s.enabled} onChange={(enabled) => update({ enabled })} last />
      </ListCard>
      <Card style={{ gap: space.md }}>
        <Input label="Meta-Pixel-ID" value={s.meta_pixel_id} onChangeText={(t) => update({ meta_pixel_id: t.trim() })} placeholder="z. B. 123456789012345" keyboardType="number-pad" />
        <Input label="Google Ads-ID" value={s.google_ads_id} onChangeText={(t) => update({ google_ads_id: t.trim().toUpperCase() })} placeholder="AW-123456789" autoCapitalize="characters" />
        <Text style={{ ...font.caption, color: colors.ink3, fontWeight: '400' }}>Mindestens eine ID ist zum Aktivieren nötig. Diese Version erfasst Seitenaufrufe; Ereignisse wie Kauf oder Freischaltung folgen separat.</Text>
      </Card>
      {error ? <ErrorNote text={error} /> : null}
      {saved && !dirty ? <Notice text="Gespeichert." /> : null}
      <Button title="Speichern" loading={busy} onPress={() => (dirty ? void save() : undefined)} kind={dirty ? 'primary' : 'plain'} />
    </>
  );
}
