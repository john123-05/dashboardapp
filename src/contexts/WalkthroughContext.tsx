import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { usePark } from './ParkContext';

export interface WalkthroughAnchorLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WalkthroughContextValue {
  visible: boolean;
  stepIndex: number;
  stepCount: number;
  enabled: boolean;
  loading: boolean;
  activeAnchorId: string | null;
  activeAnchorLayout: WalkthroughAnchorLayout | null;
  setEnabled: (enabled: boolean) => Promise<void>;
  start: () => void;
  close: (markCompleted?: boolean) => Promise<void>;
  next: () => Promise<void>;
  back: () => void;
  registerAnchor: (id: string, layout: WalkthroughAnchorLayout) => void;
  unregisterAnchor: (id: string) => void;
}

const WalkthroughContext = createContext<WalkthroughContextValue | undefined>(undefined);

const STEP_COUNT = 6;
const STEP_ANCHOR_IDS: Array<string | null> = [
  'overview-hero',
  'overview-hero',
  'overview-metrics',
  'overview-daily-chart',
  'overview-trend',
  'overview-activity',
];

function enabledKey(userId: string) {
  return `dashboardapp.walkthrough.enabled.${userId}`;
}

function completedKey(userId: string) {
  return `dashboardapp.walkthrough.completed.${userId}`;
}

export function WalkthroughProvider({ children }: PropsWithChildren) {
  const { user, hasOrg } = useAuth();
  const { parkId } = usePark();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [enabled, setEnabledState] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [anchorLayouts, setAnchorLayouts] = useState<Record<string, WalkthroughAnchorLayout>>({});
  const autoShownRef = useRef(false);

  useEffect(() => {
    autoShownRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setVisible(false);
      setStepIndex(0);
      setEnabledState(true);
      setCompleted(false);
      setLoading(false);
      return;
    }

    let active = true;
    const userId = user.id;

    async function loadState() {
      setLoading(true);
      const [enabledValue, completedValue] = await Promise.all([
        AsyncStorage.getItem(enabledKey(userId)),
        AsyncStorage.getItem(completedKey(userId)),
      ]);
      if (!active) return;

      setEnabledState(enabledValue !== 'false');
      setCompleted(completedValue === 'true');
      setLoading(false);
    }

    loadState().catch(() => {
      if (!active) return;
      setEnabledState(true);
      setCompleted(false);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (loading || !user || !hasOrg || !parkId) return;
    if (autoShownRef.current) return;
    autoShownRef.current = true;

    if (enabled && !completed) {
      setStepIndex(0);
      setVisible(true);
    }
  }, [loading, user, hasOrg, parkId, enabled, completed]);

  async function setEnabled(nextEnabled: boolean) {
    if (!user) return;
    setEnabledState(nextEnabled);
    await AsyncStorage.setItem(enabledKey(user.id), String(nextEnabled));

    if (!nextEnabled) {
      setVisible(false);
      return;
    }

    // Re-enable also resets completion so it can auto-show on next login.
    setCompleted(false);
    await AsyncStorage.setItem(completedKey(user.id), 'false');
  }

  function start() {
    setStepIndex(0);
    setVisible(true);
  }

  async function close(markCompleted = true) {
    setVisible(false);
    if (!user || !markCompleted) return;

    setCompleted(true);
    await AsyncStorage.setItem(completedKey(user.id), 'true');
  }

  async function next() {
    if (stepIndex >= STEP_COUNT - 1) {
      await close(true);
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, STEP_COUNT - 1));
  }

  function back() {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }

  function registerAnchor(id: string, layout: WalkthroughAnchorLayout) {
    setAnchorLayouts((prev) => {
      const current = prev[id];
      if (
        current &&
        Math.abs(current.x - layout.x) < 1 &&
        Math.abs(current.y - layout.y) < 1 &&
        Math.abs(current.width - layout.width) < 1 &&
        Math.abs(current.height - layout.height) < 1
      ) {
        return prev;
      }
      return { ...prev, [id]: layout };
    });
  }

  function unregisterAnchor(id: string) {
    setAnchorLayouts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  const activeAnchorId = STEP_ANCHOR_IDS[stepIndex] ?? null;
  const activeAnchorLayout = activeAnchorId ? anchorLayouts[activeAnchorId] ?? null : null;

  const value = useMemo<WalkthroughContextValue>(
    () => ({
      visible,
      stepIndex,
      stepCount: STEP_COUNT,
      enabled,
      loading,
      activeAnchorId,
      activeAnchorLayout,
      setEnabled,
      start,
      close,
      next,
      back,
      registerAnchor,
      unregisterAnchor,
    }),
    [visible, stepIndex, enabled, loading, activeAnchorId, activeAnchorLayout]
  );

  return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
}

export function useWalkthrough() {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within WalkthroughProvider');
  }
  return context;
}
