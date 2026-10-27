import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { EXTERNAL_SUPABASE_ANON_KEY, EXTERNAL_SUPABASE_URL } from './supabase';
import { getFunctionSession } from './functionAuth';
import { PREVIEW } from './preview';
import { tr } from '../i18n';

// Push in der App: das Gerät meldet sich mit seinem Expo-Push-Token in derselben Tabelle an wie
// ein Browser im Web-Dashboard (operator-push-subscription), endpoint = "expo:<token>".
// Der Server schickt dann alle Meldungen (Störung, Papier, Support, keine Fotos, CRM) auch hierher.

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const KEY = (parkId: string) => `lp-push-device:${parkId}`;

async function authHeaders() {
  const { data: { session } } = await getFunctionSession();
  if (!session?.access_token) throw new Error(tr('Sitzung abgelaufen. Bitte neu anmelden.'));
  return { Authorization: `Bearer ${session.access_token}`, apikey: EXTERNAL_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
}

async function call(fn: string, method: 'POST' | 'DELETE', body: object) {
  const res = await fetch(`${EXTERNAL_SUPABASE_URL}/functions/v1/${fn}`, { method, headers: await authHeaders(), body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || tr('HTTP {0}', res.status));
  return json;
}

export async function isDeviceRegistered(parkId: string): Promise<boolean> {
  if (PREVIEW) return true;
  return (await AsyncStorage.getItem(KEY(parkId))) !== null;
}

export async function registerDevice(parkId: string): Promise<void> {
  if (PREVIEW) return;
  if (!Device.isDevice) throw new Error(tr('Push geht nur auf einem echten Gerät.'));
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') throw new Error(tr('Mitteilungen sind für die App ausgeschaltet. Bitte in den iOS-Einstellungen erlauben.'));
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const endpoint = `expo:${token}`;
  await call('operator-push-subscription', 'POST', {
    park_id: parkId,
    endpoint,
    keys: { p256dh: 'expo', auth: 'expo' },
    userAgent: `LiftpicturesDashboardApp iOS ${Device.modelName ?? ''}`.trim(),
  });
  await AsyncStorage.setItem(KEY(parkId), endpoint);
}

export async function unregisterDevice(parkId: string): Promise<void> {
  if (PREVIEW) return;
  const endpoint = await AsyncStorage.getItem(KEY(parkId));
  if (endpoint) await call('operator-push-subscription', 'DELETE', { park_id: parkId, endpoint }).catch(() => undefined);
  await AsyncStorage.removeItem(KEY(parkId));
}

export async function sendTestPush(parkId: string): Promise<void> {
  if (PREVIEW) return;
  await call('operator-test-push', 'POST', { park_id: parkId });
}

// Web-Pfad aus der Mitteilung -> Seite in der App.
export function routeForUrl(url: string | undefined): { name: string; params?: object } {
  const path = (url || '/').split('?')[0].replace(/\/$/, '') || '/';
  const map: Record<string, string> = {
    '/': 'Overview', '/revenue': 'Revenue', '/health': 'Health', '/photos': 'Photos', '/purchases': 'Purchases',
    '/users': 'Speed', '/tickets': 'Support', '/settings': 'Settings', '/team': 'Team', '/configuration': 'Configuration', '/leads': 'Marketing',
    '/kamera': 'Camera', '/personalization': 'Personalization', '/shop': 'Shop', '/shop/bearbeiten': 'ShopEdit', '/shop/preise': 'Plans', '/plaene': 'Plans', '/leads/preise': 'Plans',
  };
  // CRM-Reiter: /leads/kontakte, /leads/email, /leads/social, /leads/umfrage, /leads/pixel
  const crm: Record<string, string> = { kontakte: 'kontakte', email: 'email', social: 'social', umfrage: 'umfrage', pixel: 'pixel' };
  const sub = path.startsWith('/leads/') ? crm[path.slice(7)] : undefined;
  if (sub) return { name: 'Marketing', params: { tab: sub } };
  if (path === '/shop/preise') return { name: 'Plans', params: { group: 'shop' } };
  const name = map[path];
  return name ? { name } : { name: 'Web', params: { path, title: 'Liftpictures' } };
}
