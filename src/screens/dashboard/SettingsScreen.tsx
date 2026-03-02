import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePark } from '../../contexts/ParkContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useWalkthrough } from '../../contexts/WalkthroughContext';
import { languageOptions, type LanguageCode } from '../../i18n/translations';
import { supabase } from '../../lib/supabase';

export function SettingsScreen() {
  const { profile, currentOrg, memberships, refreshProfile, signOut, deleteAccount } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const { mode, setMode, colors } = useAppTheme();
  const notifications = useNotifications();
  const walkthrough = useWalkthrough();
  const navigation = useNavigation<any>();
  const styles = createStyles(colors);
  const { parkName, setPark } = usePark();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const privacyPolicyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
  const supportUrl = process.env.EXPO_PUBLIC_SUPPORT_URL;

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

  function openExternal(url: string | undefined) {
    if (!url) {
      setError(t('settings_link_missing'));
      return;
    }

    Linking.openURL(url).catch(() => setError(t('settings_link_open_failed')));
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setError(null);
    const result = await deleteAccount();
    setDeletingAccount(false);
    setDeleteModalVisible(false);
    if (result.error) {
      setError(result.error);
    }
  }

  const role = memberships.find((item) => item.organization_id === currentOrg?.id)?.role ?? 'unknown';

  function startWalkthroughFromSettings() {
    navigation.navigate('Dashboard');
    setTimeout(() => {
      walkthrough.start();
    }, 220);
  }

  return (
    <Screen title={t('nav_settings')} subtitle={t('settings_subtitle')}>
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>{t('settings_profile')}</Text>

        <Text style={styles.label}>{t('common_full_name')}</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>{t('common_email')}</Text>
        <TextInput style={[styles.input, styles.disabled]} value={profile?.email ?? ''} editable={false} />

        <Text style={styles.label}>{t('common_role')}</Text>
        <TextInput
          style={[styles.input, styles.disabled]}
          value={role.replace('_', ' ')}
          editable={false}
        />

        <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={saveProfile}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{saved ? t('common_saved') : t('common_save_profile')}</Text>
          )}
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('common_language')}</Text>
        <Text style={styles.label}>{t('common_language')}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={language}
            onValueChange={(value) => setLanguage(value as LanguageCode)}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {languageOptions.map((option) => (
              <Picker.Item key={option.code} label={option.label} value={option.code} />
            ))}
          </Picker>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('settings_theme')}</Text>
        <View style={styles.themeRow}>
          <Pressable
            style={[styles.themeButton, mode === 'light' && styles.themeButtonActive]}
            onPress={() => setMode('light')}
          >
            <Text style={[styles.themeButtonText, mode === 'light' && styles.themeButtonTextActive]}>
              {t('settings_theme_light')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.themeButton, mode === 'dark' && styles.themeButtonActive]}
            onPress={() => setMode('dark')}
          >
            <Text style={[styles.themeButtonText, mode === 'dark' && styles.themeButtonTextActive]}>
              {t('settings_theme_dark')}
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('settings_walkthrough')}</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleLabel}>{t('settings_walkthrough_auto')}</Text>
            <Text style={styles.toggleHint}>{t('settings_walkthrough_auto_hint')}</Text>
          </View>
          <Switch
            value={walkthrough.enabled}
            onValueChange={(value) => walkthrough.setEnabled(value)}
            disabled={walkthrough.loading}
            trackColor={{ false: colors.border, true: colors.dataBlue }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Pressable style={styles.secondaryButton} onPress={startWalkthroughFromSettings}>
          <Text style={styles.secondaryButtonText}>{t('settings_walkthrough_start')}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('settings_notifications')}</Text>
        {!notifications.supported ? (
          <Text style={styles.helperText}>{t('settings_notifications_not_supported')}</Text>
        ) : (
          <>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleLabel}>{t('settings_notifications_enable')}</Text>
                <Text style={styles.toggleHint}>{t('settings_notifications_enable_hint')}</Text>
              </View>
              <Switch
                value={notifications.preferences.enabled}
                onValueChange={(value) => notifications.setEnabled(value)}
                disabled={notifications.loading || notifications.syncing}
                trackColor={{ false: colors.border, true: colors.dataBlue }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Pressable
              style={[styles.secondaryButton, (!notifications.preferences.enabled || notifications.syncing) && styles.primaryButtonDisabled]}
              onPress={notifications.registerForPush}
              disabled={!notifications.preferences.enabled || notifications.syncing}
            >
              <Text style={styles.secondaryButtonText}>{t('settings_notifications_register_device')}</Text>
            </Pressable>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('settings_notifications_purchase')}</Text>
              <Switch
                value={notifications.preferences.purchases}
                onValueChange={(value) => notifications.setEventEnabled('purchase', value)}
                disabled={!notifications.preferences.enabled || notifications.loading || notifications.syncing}
                trackColor={{ false: colors.border, true: colors.dataBlue }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('settings_notifications_registration')}</Text>
              <Switch
                value={notifications.preferences.registrations}
                onValueChange={(value) => notifications.setEventEnabled('registration', value)}
                disabled={!notifications.preferences.enabled || notifications.loading || notifications.syncing}
                trackColor={{ false: colors.border, true: colors.dataBlue }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('settings_notifications_health')}</Text>
              <Switch
                value={notifications.preferences.healthAlerts}
                onValueChange={(value) => notifications.setEventEnabled('health_alert', value)}
                disabled={!notifications.preferences.enabled || notifications.loading || notifications.syncing}
                trackColor={{ false: colors.border, true: colors.dataBlue }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Text style={styles.helperText}>
              {notifications.expoPushToken
                ? t('settings_notifications_device_registered')
                : t('settings_notifications_device_missing')}
            </Text>
            <Text style={styles.helperText}>
              {t('settings_notifications_permission', { status: notifications.permissionStatus })}
            </Text>
            {notifications.error ? <Text style={styles.errorText}>{notifications.error}</Text> : null}
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('settings_organization')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowKey}>{t('settings_organization_label')}</Text>
          <Text style={styles.rowValue}>{currentOrg?.name || t('common_none')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowKey}>{t('settings_park_label')}</Text>
          <Text style={styles.rowValue}>{parkName || t('common_none_selected')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowKey}>{t('settings_memberships')}</Text>
          <Text style={styles.rowValue}>{memberships.length}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('settings_legal')}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => openExternal(privacyPolicyUrl)}>
          <Text style={styles.secondaryButtonText}>{t('settings_privacy_policy')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => openExternal(supportUrl)}>
          <Text style={styles.secondaryButtonText}>{t('settings_support_link')}</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('common_session')}</Text>
        <Pressable
          style={[styles.signOutButton, signingOut && styles.primaryButtonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signOutButtonText}>{t('common_sign_out')}</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.deleteButton, deletingAccount && styles.primaryButtonDisabled]}
          onPress={() => setDeleteModalVisible(true)}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.deleteButtonText}>{t('settings_delete_account')}</Text>
          )}
        </Pressable>
      </Card>

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings_delete_account')}</Text>
            <Text style={styles.modalBody}>{t('settings_delete_account_confirm_body')}</Text>
            <View style={styles.modalRow}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingAccount}
              >
                <Text style={styles.modalCancelButtonText}>{t('common_cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalDeleteButton, deletingAccount && styles.primaryButtonDisabled]}
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>{t('settings_delete_account_confirm')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  disabled: {
    color: colors.muted,
  },
  pickerWrap: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 46,
    width: '100%',
    color: colors.text,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 10,
    alignItems: 'center',
  },
  themeButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  themeButtonText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  themeButtonTextActive: {
    color: colors.primaryText,
  },
  secondaryButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
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
  toggleRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
  },
  toggleTextWrap: {
    flex: 1,
    gap: 3,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleHint: {
    color: colors.muted,
    fontSize: 12,
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
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
  deleteButton: {
    backgroundColor: '#991B1B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalCancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalDeleteButton: {
    borderRadius: 10,
    backgroundColor: '#991B1B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 92,
    alignItems: 'center',
  },
  modalDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
