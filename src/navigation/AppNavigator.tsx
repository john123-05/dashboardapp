import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuth } from '../contexts/AuthContext';
import { usePark } from '../contexts/ParkContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { JoinOrganizationScreen } from '../screens/JoinOrganizationScreen';
import { ParkAccessScreen } from '../screens/ParkAccessScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { RevenueScreen } from '../screens/dashboard/RevenueScreen';
import { PurchasesScreen } from '../screens/dashboard/PurchasesScreen';
import { UsersScreen } from '../screens/dashboard/UsersScreen';
import { PhotosScreen } from '../screens/dashboard/PhotosScreen';
import { LeadsScreen } from '../screens/dashboard/LeadsScreen';
import { PersonalizationScreen } from '../screens/dashboard/PersonalizationScreen';
import { SupportScreen } from '../screens/dashboard/SupportScreen';
import { SystemHealthScreen } from '../screens/dashboard/SystemHealthScreen';
import { SettingsScreen } from '../screens/dashboard/SettingsScreen';
import { useI18n } from '../contexts/LanguageContext';
import { useAppTheme } from '../contexts/ThemeContext';
import type { AuthStackParamList, DashboardDrawerParamList } from './types';
import { AppDrawerContent } from './AppDrawerContent';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Drawer = createDrawerNavigator<DashboardDrawerParamList>();

function AuthNavigator() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: t('auth_create_account_header') }}
      />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const { colors } = useAppTheme();
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(15, 23, 42, 0.35)',
        drawerStyle: {
          width: 280,
          backgroundColor: colors.navBg,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Revenue" component={RevenueScreen} />
      <Drawer.Screen name="Purchases" component={PurchasesScreen} />
      <Drawer.Screen name="Users" component={UsersScreen} />
      <Drawer.Screen name="Photos" component={PhotosScreen} />
      <Drawer.Screen name="Leads" component={LeadsScreen} />
      <Drawer.Screen name="Personalization" component={PersonalizationScreen} />
      <Drawer.Screen name="Support" component={SupportScreen} />
      <Drawer.Screen name="SystemHealth" component={SystemHealthScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const auth = useAuth();
  const park = usePark();
  const { colors } = useAppTheme();

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
    },
  };

  if (auth.loading || park.loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={theme}>
      {!auth.user ? (
        <AuthNavigator />
      ) : !auth.hasOrg ? (
        <JoinOrganizationScreen />
      ) : !park.parkId ? (
        <ParkAccessScreen />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}
