import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { DefaultTheme, NavigationContainer, createNavigationContainerRef, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Platform, Text, View } from 'react-native';
import { useWide } from '../components/layout';
import { MoreSheet } from '../components/MoreSheet';
import { Screen } from '../components/Screen';
import { Sidebar } from '../components/Sidebar';
import { CoachOverlay, type CoachStep } from '../components/coach/Coach';
import { coachSteps } from '../components/coach/steps';
import { TabBar } from '../components/TabBar';
import { Button, ListCard, Row } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { usePark } from '../contexts/ParkContext';
import { canSee } from '../lib/permissions';
import { openPage, pageAvailable, PAGES } from '../lib/pages';
import { PREVIEW } from '../lib/preview';
import * as Notifications from 'expo-notifications';
import { routeForUrl } from '../lib/push';
import { AccountScreen } from '../screens/AccountScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { PersonalizationScreen } from '../screens/PersonalizationScreen';
import { OverlayStudioScreen } from '../screens/OverlayStudioScreen';
import { PlansScreen } from '../screens/PlansScreen';
import { ShopEditScreen } from '../screens/ShopEditScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { CampaignDetailScreen, CampaignEditScreen } from '../screens/marketing/CampaignScreens';
import { EmailEditScreen } from '../screens/marketing/EmailEditScreen';
import { SurveyEditScreen } from '../screens/marketing/SurveyEditScreen';
import { ConfigurationScreen } from '../screens/ConfigurationScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { MarketingScreen } from '../screens/MarketingScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { TOUR_SEEN_KEY, TourScreen } from '../screens/TourScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from '../screens/LoginScreen';
import { NewTicketScreen } from '../screens/NewTicketScreen';
import { OverviewScreen } from '../screens/OverviewScreen';
import { ParkAccessScreen } from '../screens/ParkAccessScreen';
import { PhotoDetailScreen } from '../screens/PhotoDetailScreen';
import { PhotosScreen } from '../screens/PhotosScreen';
import { PurchasesScreen } from '../screens/PurchasesScreen';
import { RevenueScreen } from '../screens/RevenueScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SpeedScreen } from '../screens/SpeedScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { SupportThreadScreen } from '../screens/SupportThreadScreen';
import { TeamEditScreen } from '../screens/TeamEditScreen';
import { TeamScreen } from '../screens/TeamScreen';
import { WebPageScreen } from '../screens/WebPageScreen';
import { colors, font } from '../theme';

const Root = createNativeStackNavigator();
const Inner = createNativeStackNavigator();
const Tabs = createMaterialTopTabNavigator();
const navRef = createNavigationContainerRef<any>();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.brand } };

const TAB_SCREENS: Record<string, React.ComponentType<any>> = { Overview: OverviewScreen, Revenue: RevenueScreen, Health: HealthScreen, Photos: PhotosScreen };

function useViewer() {
  const { isOwner, isStaff, allowedPages } = useAuth();
  return { isOwner, isStaff, allowedPages };
}

// Startseite, falls ein Mitarbeiter keine der vier Hauptseiten sehen darf.
function StartList() {
  const nav = useNavigation<any>();
  const viewer = useViewer();
  const { cameraAvailable } = usePark();
  const list = PAGES.filter((p) => canSee(p.key, viewer) && pageAvailable(p, { cameraAvailable }));
  return (
    <Screen tabs actions title="Start">
      <ListCard>
        {list.map((p, i) => (
          <Row key={p.key} icon={p.icon} title={p.title} chevron onPress={() => openPage(nav, p)} last={i === list.length - 1} />
        ))}
      </ListCard>
    </Screen>
  );
}

// Handy: vier Tabs zum Wischen, "Mehr" als Blatt von unten.
function PhoneTabs() {
  const nav = useNavigation<any>();
  const viewer = useViewer();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = PAGES.filter((p) => p.tab && canSee(p.key, viewer));
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('lp-more', (open: boolean) => setMoreOpen(open));
    return () => sub.remove();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs.Navigator
        tabBarPosition="bottom"
        tabBar={(props) => <TabBar {...props} onMore={() => setMoreOpen((o) => !o)} moreOpen={moreOpen} />}
        screenOptions={{ swipeEnabled: true, lazy: true, lazyPreloadDistance: 1, animationEnabled: true }}
        style={{ backgroundColor: colors.bg }}
      >
        {tabs.length > 0 ? tabs.map((p) => <Tabs.Screen key={p.route} name={p.route!} component={TAB_SCREENS[p.route!]} />) : <Tabs.Screen name="Start" component={StartList} />}
      </Tabs.Navigator>
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onOpenPage={(p) => {
          setMoreOpen(false);
          openPage(nav, p);
        }}
        onAccount={() => {
          setMoreOpen(false);
          nav.navigate('Account');
        }}
      />
    </View>
  );
}

// Seiten, die über Tabs, das Mehr-Blatt oder die Seitenleiste geöffnet werden (normales Hineinschieben).
function pageScreens(S: typeof Inner) {
  return (
    <>
      <S.Screen name="Purchases" component={PurchasesScreen as any} />
      <S.Screen name="Speed" component={SpeedScreen as any} />
      <S.Screen name="Marketing" component={MarketingScreen as any} />
      <S.Screen name="EmailEdit" component={EmailEditScreen as any} />
      <S.Screen name="SurveyEdit" component={SurveyEditScreen as any} />
      <S.Screen name="CampaignDetail" component={CampaignDetailScreen as any} />
      <S.Screen name="CampaignEdit" component={CampaignEditScreen as any} />
      <S.Screen name="Camera" component={CameraScreen as any} />
      <S.Screen name="Personalization" component={PersonalizationScreen as any} />
      <S.Screen name="OverlayStudio" component={OverlayStudioScreen as any} options={{ fullScreenGestureEnabled: false }} />
      <S.Screen name="Shop" component={ShopScreen as any} />
      <S.Screen name="ShopEdit" component={ShopEditScreen as any} />
      <S.Screen name="Plans" component={PlansScreen as any} />
      <S.Screen name="Support" component={SupportScreen as any} />
      <S.Screen name="SupportThread" component={SupportThreadScreen as any} />
      <S.Screen name="Settings" component={SettingsScreen as any} />
      <S.Screen name="Team" component={TeamScreen as any} />
      <S.Screen name="Account" component={AccountScreen as any} />
      <S.Screen name="Help" component={HelpScreen as any} />
      <S.Screen name="Web" component={WebPageScreen as any} />
      {/* Meldungen gleiten von links herein */}
      <S.Screen name="Alerts" component={AlertsScreen as any} options={{ animation: 'slide_from_left', fullScreenGestureEnabled: false }} />
    </>
  );
}

// Blätter von unten (iOS-Sheet), grauer Hintergrund.
function sheetScreens(S: typeof Root) {
  return (
    <S.Group screenOptions={{ presentation: 'modal' }}>
      <S.Screen name="Configuration" component={ConfigurationScreen as any} />
      <S.Screen name="NewTicket" component={NewTicketScreen as any} />
      <S.Screen name="TeamEdit" component={TeamEditScreen as any} />
      <S.Screen name="PhotoDetail" component={PhotoDetailScreen as any} />
      <S.Screen name="Park" component={ParkSwitch} />
      <S.Screen name="Tour" component={TourScreen as any} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </S.Group>
  );
}

// iPad quer und Mac: Seitenleiste wie im Web, rechts der Inhalt mit eigenem Verlauf.
function WideShell() {
  const nav = useNavigation<any>();
  const viewer = useViewer();
  const first = PAGES.find((p) => p.tab && canSee(p.key, viewer))?.route ?? 'Account';
  const [active, setActive] = useState<string | null>(first);
  const go = (name: string, params?: object) => nav.navigate('Main', { screen: name, params });
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <Sidebar
        active={active}
        onOpen={(p) => (p.modal ? nav.navigate(p.route!) : p.route ? go(p.route) : go('Web', { path: p.path, title: p.title }))}
        onAlerts={() => go('Alerts')}
        onAccount={() => go('Account')}
      />
      <View style={{ flex: 1 }}>
        <Inner.Navigator
          initialRouteName={first}
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}
          screenListeners={{ focus: (e) => setActive(String(e.target).split('-')[0]) }}
        >
          {Object.entries(TAB_SCREENS).map(([name, C]) => (
            <Inner.Screen key={name} name={name} component={C} />
          ))}
          {pageScreens(Inner)}
        </Inner.Navigator>
      </View>
    </View>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

function NoAccess() {
  const { signOut, email } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 32, gap: 10 }}>
      <Text style={{ ...font.title, color: colors.ink, textAlign: 'center' }}>Kein Zugang</Text>
      <Text style={{ ...font.subhead, color: colors.ink2, textAlign: 'center' }}>Das Konto {email ?? ''} ist noch keiner Organisation zugeordnet. Bitte wende dich an Liftpictures.</Text>
      <View style={{ width: 220, marginTop: 8 }}>
        <Button title="Abmelden" kind="plain" onPress={() => void signOut()} />
      </View>
    </View>
  );
}

function ParkSwitch({ navigation }: { navigation: { goBack: () => void } }) {
  return <ParkAccessScreen onClose={navigation.goBack} />;
}

// Nur Vorschau (EXPO_PUBLIC_PREVIEW_TOUR=1): wechselt von selbst durch alle Seiten zum Fotografieren.
function usePreviewTour(wide: boolean) {
  useEffect(() => {
    if (!PREVIEW || process.env.EXPO_PUBLIC_PREVIEW_TOUR !== '1') return;
    const main = wide ? 'Main' : 'Tabs';
    const tab = (screen: string) => () => navRef.navigate(main, { screen });
    const page = (name: string) => () => (wide ? navRef.navigate('Main', { screen: name }) : navRef.navigate(name));
    const steps: Array<() => void> = [
      tab('Overview'), tab('Revenue'), tab('Health'), tab('Photos'),
      () => DeviceEventEmitter.emit('lp-more', true),
      () => { DeviceEventEmitter.emit('lp-more', false); page('Speed')(); },
      page('Camera'), page('Marketing'), page('Personalization'), page('Shop'), page('Plans'), page('Support'), page('Settings'), page('Help'), page('Alerts'), page('Account'),
      () => navRef.navigate('Configuration'),
    ];
    let i = 0;
    const t = setInterval(() => {
      if (i >= steps.length) return clearInterval(t);
      steps[i++]();
    }, 7000);
    return () => clearInterval(t);
  }, [wide]);
}

// Im Browser (Vorschau) gibt es keine Mitteilungen; Platform.OS ändert sich nie, die Hook-Reihenfolge bleibt fest.
const useLastResponse = Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse;

// Antippen einer Mitteilung öffnet die passende Seite (auch beim Kaltstart der App).
function useNotificationTaps(ready: boolean, wide: boolean) {
  const last = useLastResponse();
  useEffect(() => {
    if (!ready || !last) return;
    const url = (last.notification.request.content.data as { url?: string } | undefined)?.url;
    const r = routeForUrl(url);
    const go = () => {
      if (!navRef.isReady()) return setTimeout(go, 300);
      const tab = ['Overview', 'Revenue', 'Health', 'Photos'].includes(r.name);
      if (wide) navRef.navigate('Main', { screen: r.name, params: r.params });
      else if (tab) navRef.navigate('Tabs', { screen: r.name });
      else navRef.navigate(r.name, r.params);
    };
    go();
  }, [last, ready, wide]);
}

// Geführter Rundgang über alle Seiten, die diese Person sehen darf.
function CoachHost({ wide }: { wide: boolean }) {
  const viewer = useViewer();
  const { cameraAvailable } = usePark();
  const steps = coachSteps(viewer, { wide, cameraAvailable });
  const go = useCallback(
    (s: CoachStep) => {
      if (!navRef.isReady()) return;
      if (wide) navRef.navigate('Main', { screen: s.route, params: s.params });
      else if (s.tab) navRef.navigate('Tabs', PAGES.some((p) => p.route === s.route && canSee(p.key, viewer)) ? { screen: s.route } : undefined);
      else navRef.navigate(s.route, s.params);
    },
    [wide, viewer],
  );
  return <CoachOverlay steps={steps} go={go} onFinish={() => void AsyncStorage.setItem(TOUR_SEEN_KEY, '1')} />;
}

export function AppNavigator() {
  const auth = useAuth();
  const park = usePark();
  const wide = useWide();
  usePreviewTour(wide);
  useNotificationTaps(Boolean(auth.user && park.parkId), wide);
  // Rundgang beim ersten Start nach der Anmeldung.
  const signedIn = PREVIEW ? false : Boolean(auth.user && park.parkId);
  useEffect(() => {
    if (!signedIn) return;
    AsyncStorage.getItem(TOUR_SEEN_KEY).then((v) => {
      if (v) return;
      const open = () => (navRef.isReady() ? navRef.navigate('Tour') : setTimeout(open, 400));
      setTimeout(open, 800);
    });
  }, [signedIn]);

  if (!PREVIEW && (auth.loading || park.loading)) return <Splash />;
  if (!PREVIEW && !auth.user) return <LoginScreen />;
  if (!PREVIEW && !auth.hasOrg) return <NoAccess />;
  if (!PREVIEW && !park.parkId) return <ParkAccessScreen />;

  return (
    <NotificationsProvider>
      <NavigationContainer ref={navRef} theme={theme}>
        <Root.Navigator screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true, contentStyle: { backgroundColor: colors.bg } }}>
          {wide ? (
            <Root.Screen name="Main" component={WideShell} />
          ) : (
            <>
              <Root.Screen name="Tabs" component={PhoneTabs} />
              {pageScreens(Root as any)}
            </>
          )}
          {sheetScreens(Root)}
        </Root.Navigator>
        <CoachHost wide={wide} />
      </NavigationContainer>
    </NotificationsProvider>
  );
}
