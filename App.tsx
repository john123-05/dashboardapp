import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppearanceProvider, useLook } from './src/contexts/AppearanceContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ParkProvider } from './src/contexts/ParkContext';
import { AppNavigator } from './src/navigation/AppNavigator';

function Bar() {
  const { isDark } = useLook();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppearanceProvider>
          <AuthProvider>
            <ParkProvider>
              <Bar />
              <AppNavigator />
            </ParkProvider>
          </AuthProvider>
        </AppearanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
