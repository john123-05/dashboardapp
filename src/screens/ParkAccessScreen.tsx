import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { invokeEdgeFunction } from '../lib/edgeFunctions';
import type { ParkSelection } from '../lib/types';
import { supabase } from '../lib/supabase';
import { useI18n } from '../contexts/LanguageContext';
import { usePark } from '../contexts/ParkContext';
import { colors } from '../theme/colors';

export function ParkAccessScreen() {
  const { t } = useI18n();
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
      setError(t('park_access_select_error'));
      return;
    }

    setError(null);
    setSubmitting(true);

    const { data: ok, error: verifyError } = await supabase.rpc('verify_park_access', {
      p_park_id: selectedParkId,
      p_password: parkPassword,
    });

    if (verifyError || !ok) {
      setError(t('park_access_invalid_error'));
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
        <Text style={styles.loadingText}>{t('common_loading_parks')}</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={{
        uri: 'https://xcrxltiiovpoladpaewd.supabase.co/storage/v1/object/public/test/liftpicturesattraction.jpg',
      }}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <BlurView intensity={40} tint="light" style={styles.panel}>
          <Text style={styles.title}>{t('park_access_title')}</Text>
          <Text style={styles.subtitle}>{t('park_access_subtitle')}</Text>

          <Text style={styles.label}>{t('park_access_park')}</Text>
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

            {parks.length === 0 ? <Text style={styles.emptyParks}>{t('park_access_no_parks')}</Text> : null}
          </View>

          <Text style={styles.label}>{t('park_access_park_password')}</Text>
          <TextInput
            secureTextEntry
            style={styles.input}
            placeholder={t('park_access_placeholder_password')}
            placeholderTextColor="#475569"
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
              <Text style={styles.primaryButtonText}>{t('common_continue')}</Text>
            )}
          </Pressable>
        </BlurView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.58)',
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#0F172A',
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
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  parkButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  parkButtonText: {
    color: '#0F172A',
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
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
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
