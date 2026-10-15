import { invokeEdgeFunction } from './edgeFunctions';
import { PREVIEW } from './preview';

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface SupportMessage {
  id: string;
  ticket_id: string;
  author_role: 'operator' | 'support';
  message: string;
  created_at: string;
}

export const STATUS_LABEL: Record<SupportTicket['status'], string> = { open: 'Offen', in_progress: 'In Bearbeitung', resolved: 'Gelöst', closed: 'Geschlossen' };
export const PRIORITY_LABEL: Record<SupportTicket['priority'], string> = { low: 'Niedrig', medium: 'Normal', high: 'Hoch', critical: 'Dringend' };
export const SUPPORT_PHONE = '+49 5222 8504-90';
export const SUPPORT_PHONE_HREF = 'tel:+495222850490';

const unwrap = <T,>(r: { data: T | null; error: string | null }): T => {
  if (r.error || !r.data) throw new Error(r.error || 'Keine Antwort');
  return r.data;
};

export async function loadTickets(parkId: string, archived = false): Promise<SupportTicket[]> {
  if (PREVIEW) return (await import('./mock')).previewTickets(archived);
  return unwrap(await invokeEdgeFunction<{ tickets: SupportTicket[] }>('support-tickets', { useSessionAuth: true, query: { park_id: parkId, ...(archived ? { archived: '1' } : {}) } })).tickets ?? [];
}
export async function loadTicketMessages(parkId: string, ticketId: string): Promise<SupportMessage[]> {
  if (PREVIEW) return (await import('./mock')).previewMessages(ticketId);
  return unwrap(await invokeEdgeFunction<{ messages: SupportMessage[] }>('support-tickets', { useSessionAuth: true, query: { park_id: parkId, ticket_id: ticketId } })).messages ?? [];
}
export async function replyTicket(parkId: string, ticketId: string, message: string) {
  if (PREVIEW) return;
  const r = await invokeEdgeFunction('support-tickets', { method: 'POST', useSessionAuth: true, body: { park_id: parkId, ticket_id: ticketId, message } });
  if (r.error) throw new Error(r.error);
}
export async function createTicket(parkId: string, form: { subject: string; description: string; priority: SupportTicket['priority']; email: string; name: string }) {
  if (PREVIEW) return;
  const r = await invokeEdgeFunction('support-tickets', {
    method: 'POST',
    useSessionAuth: true,
    body: { park_id: parkId, subject: form.subject, description: form.description, priority: form.priority, reporter_email: form.email, reporter_name: form.name },
  });
  if (r.error) throw new Error(r.error);
}
export async function archiveTicket(parkId: string, ticketId: string, archived: boolean) {
  if (PREVIEW) return;
  const r = await invokeEdgeFunction('support-tickets', { method: 'PATCH', useSessionAuth: true, body: { park_id: parkId, ticket_id: ticketId, archived } });
  if (r.error) throw new Error(r.error);
}
