import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

interface ParkState {
  parkId: string | null;
  parkName: string | null;
  loading: boolean;
  setPark: (parkId: string | null, parkName: string | null) => Promise<void>;
}

const STORAGE_KEY = 'selected_park';
const ParkContext = createContext<ParkState | null>(null);

export function ParkProvider({ children }: PropsWithChildren) {
  const [parkId, setParkId] = useState<string | null>(null);
  const [parkName, setParkName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;

        try {
          const parsed = JSON.parse(raw) as { id: string; name: string };
          setParkId(parsed.id);
          setParkName(parsed.name);
        } catch {
          AsyncStorage.removeItem(STORAGE_KEY);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function setPark(nextId: string | null, nextName: string | null) {
    setParkId(nextId);
    setParkName(nextName);

    if (nextId && nextName) {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          id: nextId,
          name: nextName,
        })
      );
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }

  const value = useMemo<ParkState>(
    () => ({
      parkId,
      parkName,
      loading,
      setPark,
    }),
    [parkId, parkName, loading]
  );

  return <ParkContext.Provider value={value}>{children}</ParkContext.Provider>;
}

export function usePark() {
  const context = useContext(ParkContext);
  if (!context) {
    throw new Error('usePark must be used within ParkProvider');
  }

  return context;
}
