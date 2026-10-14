import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const tapHaptic = () => {
  if (Platform.OS === 'ios') void Haptics.selectionAsync().catch(() => undefined);
};
export const successHaptic = () => {
  if (Platform.OS === 'ios') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
};
