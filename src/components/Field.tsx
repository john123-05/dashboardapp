import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors, font, radius, space } from '../theme';

// Eingabefeld mit 52 pt Höhe, großer Schrift (iOS zoomt unter 16 pt) und Anzeigen-Knopf für Passwörter.
export const Field = forwardRef<TextInput, TextInputProps & { label: string; secure?: boolean }>(function Field({ label, secure, style, ...rest }, ref) {
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.ink3}
          style={[styles.input, style]}
          secureTextEntry={secure && !shown}
          autoCorrect={false}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setShown((s) => !s)} hitSlop={10} style={styles.eye} accessibilityLabel={shown ? 'Passwort verbergen' : 'Passwort anzeigen'}>
            <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.ink3} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  label: { ...font.footnote, color: colors.ink2, fontWeight: '600', marginLeft: 2 },
  box: { minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: space.md },
  input: { flex: 1, ...font.body, fontSize: 17, color: colors.ink, paddingVertical: 12 },
  eye: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
