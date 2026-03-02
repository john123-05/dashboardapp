import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/LanguageContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import type { SupportTicket } from '../../lib/types';
import { formatRelative } from '../../lib/utils';

export function SupportScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { currentOrg, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const result = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (result.error) {
      setError(result.error.message);
      setTickets([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setTickets((result.data ?? []) as SupportTicket[]);
    setError(null);
    setLoading(false);
    setRefreshing(false);
  }

  async function createTicket() {
    if (!currentOrg || !user) {
      setError(t('support_missing_context'));
      return;
    }

    if (!subject.trim() || !description.trim()) {
      setError(t('support_required_error'));
      return;
    }

    setError(null);
    setCreating(true);

    const result = await supabase.from('support_tickets').insert({
      organization_id: currentOrg.id,
      created_by: user.id,
      subject: subject.trim(),
      description: description.trim(),
      priority,
    });

    setCreating(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSubject('');
    setDescription('');
    setPriority('medium');
    await loadTickets(true);
  }

  if (loading) {
    return <Screen title={t('nav_support')}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title={t('nav_support')}
      subtitle={t('support_subtitle')}
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadTickets(true)}>
          <Text style={styles.refreshButtonText}>
            {refreshing ? t('common_refreshing') : t('common_refresh')}
          </Text>
        </Pressable>
      }
    >
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>{t('support_create_ticket')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('support_subject')}
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('support_description')}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.priorityRow}>
          {(['low', 'medium', 'high', 'critical'] as const).map((value) => {
            const selected = priority === value;
            return (
              <Pressable
                key={value}
                style={[styles.priorityButton, selected && styles.priorityButtonSelected]}
                onPress={() => setPriority(value)}
              >
                <Text style={[styles.priorityButtonText, selected && styles.priorityButtonTextSelected]}>
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.primaryButton, creating && styles.primaryButtonDisabled]}
          onPress={createTicket}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('support_create_ticket')}</Text>
          )}
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('support_open_tickets', { count: tickets.length })}</Text>
        {tickets.length === 0 ? (
          <Text style={styles.muted}>{t('support_no_tickets')}</Text>
        ) : (
          tickets.slice(0, 80).map((ticket) => (
            <View key={ticket.id} style={styles.ticketRow}>
              <View style={styles.ticketLeft}>
                <Text style={styles.ticketTitle}>{ticket.subject}</Text>
                <Text style={styles.ticketBody}>{ticket.description}</Text>
                <Text style={styles.ticketTime}>{formatRelative(ticket.created_at)}</Text>
              </View>
              <View style={styles.ticketRight}>
                <StatusPill value={ticket.status} />
                <StatusPill value={ticket.priority} />
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  refreshButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '700',
  },
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
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.background,
  },
  priorityButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  priorityButtonText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  priorityButtonTextSelected: {
    color: colors.primaryText,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  ticketRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  ticketLeft: {
    flex: 1,
    gap: 2,
  },
  ticketRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ticketTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  ticketBody: {
    color: colors.muted,
    fontSize: 13,
  },
  ticketTime: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
