import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { Button } from '../components/ui';
import { tapHaptic } from '../components/haptics';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { colors, font, HEADER_HEIGHT, TAP } from '../theme';

export const DASHBOARD_URL = 'https://dashboard-liftpictures.com';
const SESSION_KEY = 'sb-xcrxltiiovpoladpaewd-auth-token';
const HOST = new URL(DASHBOARD_URL).host;

// Seiten, die in der App noch nicht nativ sind, öffnen sich hier: die Seite des Web-Dashboards in der
// App-Hülle. Die Anmeldung und der gewählte Park werden übergeben; das Dashboard erkennt die App am
// Namen im User-Agent und blendet seine eigene Leiste aus. Die App bleibt die einzige, die das Token
// erneuert, neue Tokens gehen per Nachricht in die Seite.
export function WebPageScreen({ route, navigation }: { route: { params: { path: string; title: string } }; navigation: { goBack: () => void } }) {
  const { path, title } = route.params;
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { parkId, parkName } = usePark();
  const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const initialScript = useMemo(() => {
    const s = sessionRef.current;
    const lines: string[] = ['try{'];
    if (s) lines.push(`localStorage.setItem(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(JSON.stringify(s))});`);
    if (parkId && parkName) lines.push(`localStorage.setItem('selected_park', ${JSON.stringify(JSON.stringify({ id: parkId, name: parkName }))});`);
    lines.push('}catch(e){} true;');
    return lines.join('');
    // Nur beim Öffnen: die Seite bekommt das Token einmal vorab, spätere Tokens kommen per Nachricht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkId, parkName]);

  useEffect(() => {
    if (!session || !web.current) return;
    web.current.injectJavaScript(
      `try{localStorage.setItem(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(JSON.stringify(session))});window.dispatchEvent(new CustomEvent('lp-app-session',{detail:${JSON.stringify(session)}}));}catch(e){} true;`,
    );
  }, [session]);

  const onShouldStart = (req: ShouldStartLoadRequest) => {
    try {
      const u = new URL(req.url);
      if (u.protocol === 'about:' || u.protocol === 'blob:' || u.protocol === 'data:' || u.host === HOST) return true;
      if (req.isTopFrame === false) return true;
    } catch {
      return true;
    }
    void Linking.openURL(req.url).catch(() => undefined);
    return false;
  };

  const top = insets.top + HEADER_HEIGHT;
  return (
    <View style={styles.root}>
      {failed ? (
        <View style={[styles.center, { paddingTop: top }]}>
          <Text style={styles.failTitle}>Seite konnte nicht geladen werden</Text>
          <Text style={styles.failText}>Bitte Internetverbindung prüfen.</Text>
          <View style={{ width: 220 }}>
            <Button
              title="Erneut versuchen"
              onPress={() => {
                setFailed(false);
                setLoading(true);
                web.current?.reload();
              }}
            />
          </View>
        </View>
      ) : (
        <WebView
          ref={web}
          source={{ uri: `${DASHBOARD_URL}${path}` }}
          style={[styles.web, { marginTop: top, marginBottom: 0 }]}
          injectedJavaScriptBeforeContentLoaded={initialScript}
          domStorageEnabled
          sharedCookiesEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          decelerationRate="normal"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          onShouldStartLoadWithRequest={onShouldStart}
          onLoadEnd={() => setLoading(false)}
          onError={() => setFailed(true)}
          onContentProcessDidTerminate={() => web.current?.reload()}
          applicationNameForUserAgent="LiftpicturesDashboardApp/1.2"
          bounces
        />
      )}
      {loading && !failed ? (
        <View style={[styles.loader, { top }]} pointerEvents="none">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : null}
      <View style={[styles.header, { height: top, paddingTop: insets.top }]}>
        <BlurView intensity={70} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
        <View style={styles.hairline} />
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              tapHaptic();
              navigation.goBack();
            }}
            hitSlop={8}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Zurück"
          >
            <Ionicons name="chevron-back" size={26} color={colors.brand} />
            <Text style={styles.backText}>Zurück</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ width: 90 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  web: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  failTitle: { ...font.headline, color: colors.ink },
  failText: { ...font.subhead, color: colors.ink2, marginBottom: 8 },
  loader: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  hairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  row: { height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  back: { width: 90, flexDirection: 'row', alignItems: 'center', minHeight: TAP },
  backText: { ...font.body, color: colors.brand, marginLeft: -2 },
  title: { flex: 1, textAlign: 'center', ...font.headline, color: colors.ink },
});
