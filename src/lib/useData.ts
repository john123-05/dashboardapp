import { useCallback, useEffect, useRef, useState } from 'react';
import { tr } from '../i18n';

// Kleiner Zwischenspeicher: beim Wechsel zwischen Tabs erscheinen sofort die letzten Zahlen,
// im Hintergrund wird aktualisiert (kein Springen, kein leerer Bildschirm).
const cache = new Map<string, { at: number; value: unknown }>();

export function useData<T>(key: string | null, loader: () => Promise<T>, deps: unknown[] = [], refreshMs = 0) {
  const cached = key ? (cache.get(key)?.value as T | undefined) : undefined;
  const [data, setData] = useState<T | undefined>(cached);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(cached === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const seq = useRef(0);

  const run = useCallback(
    async (mode: 'initial' | 'pull' | 'silent') => {
      if (!key) return;
      const mine = ++seq.current;
      if (mode === 'pull') setRefreshing(true);
      try {
        const value = await loaderRef.current();
        if (mine !== seq.current) return;
        cache.set(key, { at: Date.now(), value });
        setData(value);
        setError(null);
      } catch (e) {
        if (mine !== seq.current) return;
        setError(e instanceof Error ? e.message : tr('Fehler beim Laden'));
      } finally {
        if (mine === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [key],
  );

  useEffect(() => {
    const hit = key ? (cache.get(key)?.value as T | undefined) : undefined;
    setData(hit);
    setLoading(hit === undefined);
    setError(null);
    void run('initial');
    if (!refreshMs) return;
    const timer = setInterval(() => void run('silent'), refreshMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshMs, ...deps]);

  return { data, error, loading, refreshing, reload: () => run('pull') };
}
