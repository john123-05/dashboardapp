import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import type { AppStackParamList, AuthStackParamList } from './types';
import { colors } from '../theme/colors';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
  },
};

function AuthNavigator() {
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
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <AppStack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <AppStack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Revenue" component={RevenueScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Purchases" component={PurchasesScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Users" component={UsersScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Photos" component={PhotosScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Leads" component={LeadsScreen} options={{ headerShown: false }} />
      <AppStack.Screen
        name="Personalization"
        component={PersonalizationScreen}
        options={{ headerShown: false }}
      />
      <AppStack.Screen name="Support" component={SupportScreen} options={{ headerShown: false }} />
      <AppStack.Screen
        name="SystemHealth"
        component={SystemHealthScreen}
        options={{ headerShown: false }}
      />
      <AppStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </AppStack.Navigator>
  );
}

export function AppNavigator() {
  const auth = useAuth();
  const park = usePark();

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
