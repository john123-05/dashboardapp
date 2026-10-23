import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { fetchKioskSales, type OpeningHours } from '../lib/kioskSales';
import type { OpeningHoursConfig } from '../lib/types';
import { PREVIEW, PREVIEW_PARK } from '../lib/preview';
import { previewKioskSales } from '../lib/mock';
import { loadHealth } from '../lib/data';
import { cameraControlAvailable, cameraPageSetting } from '../lib/camera';
import { tr } from '../i18n';

interface ParkState {
  loading: boolean;
  parkId: string | null;
  parkName: string | null;
  setPark: (id: string | null, name: string | null) => Promise<void>;
  isKioskPark: boolean;
  priceCents: number | null;
  timezone: string;
  openingHours: OpeningHours | null;
  openingHoursConfig: OpeningHoursConfig | null;
  kioskLoading: boolean;
  reloadKiosk: () => void;
  // Wie im Web: die Seite „Kamera“ gibt es nur, solange ein Automat seine Kamera erreichbar meldet
  // und sie im CRM nicht für diesen Kunden ausgeblendet ist.
  cameraAvailable: boolean | null;
}

const STORAGE_KEY = 'selected_park';
const ParkContext = createContext<ParkState | null>(null);

export function ParkProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(!PREVIEW);
  const [park, setParkState] = useState<{ id: string; name: string } | null>(PREVIEW ? PREVIEW_PARK : null);
  const [isKioskPark, setIsKioskPark] = useState(false);
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [timezone, setTimezone] = useState('Europe/Vienna');
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);
  const [openingHoursConfig, setOpeningHoursConfig] = useState<OpeningHoursConfig | null>(null);
  const [kioskLoading, setKioskLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (PREVIEW) return;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as { id: string; name: string };
          if (parsed?.id) setParkState(parsed);
        } catch {
          void AsyncStorage.removeItem(STORAGE_KEY);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!park) {
      setKioskLoading(false);
      return;
    }
    setKioskLoading(true);
    const load = PREVIEW ? Promise.resolve(previewKioskSales()) : fetchKioskSales(park.id);
    load
      .then((result) => {
        if (cancelled) return;
        setIsKioskPark(result.isKioskPark);
        setPriceCents(result.priceCents);
        setTimezone(result.timezone ?? 'Europe/Vienna');
        setOpeningHours(result.openingHours ?? null);
        setOpeningHoursConfig(result.openingHoursConfig ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setIsKioskPark(false);
      })
      .finally(() => !cancelled && setKioskLoading(false));
    return () => {
      cancelled = true;
    };
  }, [park, nonce]);

  useEffect(() => {
    if (!park) {
      setCameraAvailable(null);
      return;
    }
    let cancelled = false;
    // Automatisch, sobald ein Automat seine Kamera meldet – außer im CRM für diesen Kunden ausgeblendet.
    const check = () =>
      Promise.all([cameraPageSetting(park.id), loadHealth(park.id)])
        .then(([setting, machines]) => !cancelled && setCameraAvailable(setting !== 'hidden' && cameraControlAvailable(machines)))
        .catch(() => !cancelled && setCameraAvailable(false));
    setCameraAvailable(null);
    void check();
    const timer = setInterval(check, 5 * 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [park, nonce]);

  const setPark = useCallback(async (id: string | null, name: string | null) => {
    if (id && name) {
      setParkState({ id, name });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }));
    } else {
      setParkState(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<ParkState>(
    () => ({
      loading,
      parkId: park?.id ?? null,
      parkName: park?.name ?? null,
      setPark,
      isKioskPark,
      priceCents,
      timezone,
      openingHours,
      openingHoursConfig,
      kioskLoading,
      reloadKiosk: () => setNonce((n) => n + 1),
      cameraAvailable,
    }),
    [loading, park, setPark, isKioskPark, priceCents, timezone, openingHours, openingHoursConfig, kioskLoading, cameraAvailable],
  );

  return <ParkContext.Provider value={value}>{children}</ParkContext.Provider>;
}

export function usePark() {
  const ctx = useContext(ParkContext);
  if (!ctx) throw new Error(tr('usePark außerhalb von ParkProvider'));
  return ctx;
}
