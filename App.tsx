import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppearanceProvider, useLook } from './src/contexts/AppearanceContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ParkProvider } from './src/contexts/ParkContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initLanguage } from './src/i18n';

function Bar() {
  const { isDark } = useLook();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  // Gespeicherte Sprache lesen, bevor die ersten Texte gezeichnet werden (dauert nur Millisekunden).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void initLanguage().finally(() => setReady(true));
  }, []);
  if (!ready) return null;
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
