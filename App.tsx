import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalkthroughOverlay } from './src/components/WalkthroughOverlay';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { ParkProvider } from './src/contexts/ParkContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ThemeProvider, useAppTheme } from './src/contexts/ThemeContext';
import { WalkthroughProvider } from './src/contexts/WalkthroughContext';
import { AppNavigator } from './src/navigation/AppNavigator';

function Root() {
  const { mode } = useAppTheme();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
      <WalkthroughOverlay />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <ParkProvider>
                <WalkthroughProvider>
                  <Root />
                </WalkthroughProvider>
              </ParkProvider>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
