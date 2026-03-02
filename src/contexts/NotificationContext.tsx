import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationEventType = 'purchase' | 'registration' | 'health_alert';

interface NotificationPreferences {
  enabled: boolean;
  purchases: boolean;
  registrations: boolean;
  healthAlerts: boolean;
}

interface NotificationContextValue {
  supported: boolean;
  isDevice: boolean;
  permissionStatus: Notifications.PermissionStatus | 'unsupported';
  expoPushToken: string | null;
  preferences: NotificationPreferences;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  registerForPush: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setEventEnabled: (eventType: NotificationEventType, enabled: boolean) => Promise<void>;
}

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  purchases: true,
  registrations: true,
  healthAlerts: true,
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const supported = Platform.OS === 'ios' || Platform.OS === 'android';
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | 'unsupported'>(
      supported ? Notifications.PermissionStatus.UNDETERMINED : 'unsupported'
    );
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }

    Notifications.getPermissionsAsync()
      .then((result) => {
        setPermissionStatus(result.status);
      })
      .catch(() => undefined);
  }, [supported]);

  useEffect(() => {
    if (!user) {
      setPreferences(defaultPreferences);
      setExpoPushToken(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    const userId = user.id;

    async function loadSettings() {
      setLoading(true);
      setError(null);

      const prefResult = await supabase
        .from('user_notification_preferences')
        .select('receive_push, notify_purchase, notify_registration, notify_health_alert')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active) return;

      if (prefResult.error) {
        setError(prefResult.error.message);
      } else if (prefResult.data) {
        setPreferences({
          enabled: prefResult.data.receive_push ?? true,
          purchases: prefResult.data.notify_purchase ?? true,
          registrations: prefResult.data.notify_registration ?? true,
          healthAlerts: prefResult.data.notify_health_alert ?? true,
        });
      } else {
        await upsertPreferences(userId, defaultPreferences);
      }

      const tokenResult = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('platform', Platform.OS)
        .eq('enabled', true)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (!tokenResult.error) {
        setExpoPushToken(tokenResult.data?.token ?? null);
      }

      setLoading(false);
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, [supported, user]);

  async function upsertPreferences(userId: string, next: NotificationPreferences) {
    const result = await supabase.from('user_notification_preferences').upsert(
      {
        user_id: userId,
        receive_push: next.enabled,
        notify_purchase: next.purchases,
        notify_registration: next.registrations,
        notify_health_alert: next.healthAlerts,
      },
      { onConflict: 'user_id' }
    );

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async function setEnabled(enabled: boolean) {
    if (!user) return;
    setSyncing(true);
    setError(null);
    const next = { ...preferences, enabled };
    setPreferences(next);

    try {
      await upsertPreferences(user.id, next);
      await supabase.from('user_push_tokens').update({ enabled }).eq('user_id', user.id);
      if (enabled && !expoPushToken) {
        await registerForPush();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update notification settings');
    } finally {
      setSyncing(false);
    }
  }

  async function setEventEnabled(eventType: NotificationEventType, enabled: boolean) {
    if (!user) return;
    setSyncing(true);
    setError(null);

    const key =
      eventType === 'purchase'
        ? 'purchases'
        : eventType === 'registration'
          ? 'registrations'
          : 'healthAlerts';

    const next = {
      ...preferences,
      [key]: enabled,
    };

    setPreferences(next);

    try {
      await upsertPreferences(user.id, next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update notification settings');
    } finally {
      setSyncing(false);
    }
  }

  async function registerForPush() {
    if (!supported || !user) return;
    setSyncing(true);
    setError(null);

    try {
      if (!Device.isDevice) {
        throw new Error('Push notifications require a physical device.');
      }

      let currentPermission = permissionStatus;
      if (currentPermission !== 'granted') {
        const request = await Notifications.requestPermissionsAsync();
        currentPermission = request.status;
        setPermissionStatus(request.status);
      }

      if (currentPermission !== 'granted') {
        throw new Error('Push notification permission was not granted.');
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        undefined;

      if (!projectId) {
        throw new Error('Missing EAS project ID for push token registration.');
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      setExpoPushToken(tokenResponse.data);

      const saveResult = await supabase.from('user_push_tokens').upsert(
        {
          user_id: user.id,
          token: tokenResponse.data,
          platform: Platform.OS,
          app_version: Constants.expoConfig?.version ?? null,
          device_model: Device.modelName ?? null,
          enabled: preferences.enabled,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );

      if (saveResult.error) {
        throw new Error(saveResult.error.message);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Push registration failed');
    } finally {
      setSyncing(false);
    }
  }

  const value = useMemo<NotificationContextValue>(
    () => ({
      supported,
      isDevice: Device.isDevice,
      permissionStatus,
      expoPushToken,
      preferences,
      loading,
      syncing,
      error,
      registerForPush,
      setEnabled,
      setEventEnabled,
    }),
    [supported, permissionStatus, expoPushToken, preferences, loading, syncing, error]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
