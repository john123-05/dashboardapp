import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ParkProvider } from './src/contexts/ParkContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ParkProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </ParkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
