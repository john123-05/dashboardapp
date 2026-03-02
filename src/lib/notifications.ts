import { invokeEdgeFunction } from './edgeFunctions';

type NotificationEventType = 'purchase' | 'registration' | 'health_alert' | 'generic';

interface PushEventPayload {
  eventType: NotificationEventType;
  title: string;
  body: string;
  organizationId?: string;
  userIds?: string[];
  data?: Record<string, unknown>;
}

export async function sendPushEvent(payload: PushEventPayload) {
  return invokeEdgeFunction<{
    sent: number;
    failed: number;
    targetedUsers: number;
    targetedDevices: number;
  }>('send-push-notifications', {
    method: 'POST',
    body: payload,
  });
}
