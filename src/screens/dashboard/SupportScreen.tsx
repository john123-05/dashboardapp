import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { SupportTicket } from '../../lib/types';
import { formatRelative } from '../../lib/utils';
import { colors } from '../../theme/colors';

export function SupportScreen() {
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
      setError('Missing organization or user context.');
      return;
    }

    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
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
    return <Screen title="Support"><ActivityIndicator color={colors.primary} /></Screen>;
  }

  return (
    <Screen
      title="Support"
      subtitle="Support tickets and contact status"
      right={
        <Pressable style={styles.refreshButton} onPress={() => loadTickets(true)}>
          <Text style={styles.refreshButtonText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      }
    >
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Create Ticket</Text>
        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
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
            <Text style={styles.primaryButtonText}>Create Ticket</Text>
          )}
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Open Tickets ({tickets.length})</Text>
        {tickets.length === 0 ? (
          <Text style={styles.muted}>No support tickets yet.</Text>
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

const styles = StyleSheet.create({
  refreshButton: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: '#0369A1',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
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
    backgroundColor: '#F9FAFB',
  },
  priorityButtonSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  priorityButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  priorityButtonTextSelected: {
    color: '#0369A1',
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
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
});
