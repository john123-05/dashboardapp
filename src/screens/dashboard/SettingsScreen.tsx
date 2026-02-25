import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { usePark } from '../../contexts/ParkContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

export function SettingsScreen() {
  const { profile, currentOrg, memberships, refreshProfile, signOut } = useAuth();
  const { parkName, setPark } = usePark();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  async function saveProfile() {
    if (!profile) return;

    setError(null);
    setSaving(true);

    const result = await supabase
      .from('operator_profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await setPark(null, null);
    await signOut();
    setSigningOut(false);
  }

  const role = memberships.find((item) => item.organization_id === currentOrg?.id)?.role ?? 'unknown';

  return (
    <Screen title="Settings" subtitle="Profile and organization configuration">
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Profile</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={[styles.input, styles.disabled]} value={profile?.email ?? ''} editable={false} />

        <Text style={styles.label}>Role</Text>
        <TextInput
          style={[styles.input, styles.disabled]}
          value={role.replace('_', ' ')}
          editable={false}
        />

        <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={saveProfile}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{saved ? 'Saved' : 'Save Profile'}</Text>
          )}
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Organization</Text>
        <View style={styles.row}>
          <Text style={styles.rowKey}>Organization</Text>
          <Text style={styles.rowValue}>{currentOrg?.name || 'None'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowKey}>Park</Text>
          <Text style={styles.rowValue}>{parkName || 'None selected'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowKey}>Memberships</Text>
          <Text style={styles.rowValue}>{memberships.length}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Session</Text>
        <Pressable
          style={[styles.signOutButton, signingOut && styles.primaryButtonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          )}
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
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
  disabled: {
    color: '#6B7280',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowKey: {
    color: colors.muted,
    fontSize: 14,
  },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  signOutButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
