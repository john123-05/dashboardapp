import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ParkProvider } from './src/contexts/ParkContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { APPEARANCE_KEY, applyAppearance } from './src/screens/AccountScreen';

export default function App() {
  // Gespeichertes Erscheinungsbild (Hell, Dunkel oder wie das iPhone) beim Start anwenden.
  useEffect(() => {
    void AsyncStorage.getItem(APPEARANCE_KEY).then(applyAppearance);
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ParkProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </ParkProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
