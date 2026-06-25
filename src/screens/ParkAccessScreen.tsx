import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { invokeEdgeFunction } from '../lib/edgeFunctions';
import type { ParkSelection } from '../lib/types';
import { supabase } from '../lib/supabase';
import { usePark } from '../contexts/ParkContext';
import { colors } from '../theme/colors';

export function ParkAccessScreen() {
  const { setPark } = usePark();
  const [parks, setParks] = useState<ParkSelection[]>([]);
  const [selectedParkId, setSelectedParkId] = useState<string>('');
  const [parkPassword, setParkPassword] = useState('');
  const [loadingParks, setLoadingParks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    invokeEdgeFunction<{ parks: ParkSelection[] }>('external-parks')
      .then((result) => {
        if (!active) return;

        if (result.error) {
          setError(result.error);
          setParks([]);
          return;
        }

        const loaded = result.data?.parks ?? [];
        setParks(loaded);
        if (loaded.length > 0) {
          setSelectedParkId(loaded[0].id);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingParks(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleContinue() {
    if (!selectedParkId || !parkPassword) {
      setError('Select a park and enter the park password.');
      return;
    }

    setError(null);
    setSubmitting(true);

    const { data: ok, error: verifyError } = await supabase.rpc('verify_park_access', {
      p_park_id: selectedParkId,
      p_password: parkPassword,
    });

    if (verifyError || !ok) {
      setError('Invalid park password.');
      setSubmitting(false);
      return;
    }

    const selectedPark = parks.find((item) => item.id === selectedParkId);
    await setPark(selectedParkId, selectedPark?.name ?? null);
    setSubmitting(false);
  }

  if (loadingParks) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading parks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Park Access</Text>
        <Text style={styles.subtitle}>Choose your park and confirm access password</Text>

        <Text style={styles.label}>Park</Text>
        <View style={styles.pickerWrap}>
          {parks.map((park) => {
            const selected = park.id === selectedParkId;
            return (
              <Pressable
                key={park.id}
                style={[styles.parkButton, selected && styles.parkButtonSelected]}
                onPress={() => setSelectedParkId(park.id)}
              >
                <Text style={[styles.parkButtonText, selected && styles.parkButtonTextSelected]}>
                  {park.name}
                </Text>
              </Pressable>
            );
          })}

          {parks.length === 0 ? <Text style={styles.emptyParks}>No parks found.</Text> : null}
        </View>

        <Text style={styles.label}>Park Password</Text>
        <TextInput
          secureTextEntry
          style={styles.input}
          placeholder="Enter park password"
          value={parkPassword}
          onChangeText={setParkPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          disabled={submitting}
          onPress={handleContinue}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.background,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  pickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  parkButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
  },
  parkButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  parkButtonText: {
    color: '#1F2937',
    fontWeight: '500',
  },
  parkButtonTextSelected: {
    color: colors.primaryText,
  },
  emptyParks: {
    color: colors.muted,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 10,
  },
  loadingText: {
    color: colors.muted,
  },
});
