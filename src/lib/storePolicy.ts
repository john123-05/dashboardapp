import { Platform } from 'react-native';

// App Store 3.1.1 (Prüfung 30.10.2026, Version 1.5.8): In der iOS-App keine Registrierung für Betriebe und keine
// Preise, Pakete oder Upgrade-/Anfrage-Knöpfe – Zugänge legen wir an, gebucht wird nur im Web-Dashboard.
// Android/Web bleiben unverändert.
export const NO_IN_APP_COMMERCE = Platform.OS === 'ios';
