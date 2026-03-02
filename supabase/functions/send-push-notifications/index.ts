import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type EventType = 'purchase' | 'registration' | 'health_alert' | 'generic';

type RequestPayload = {
  eventType: EventType;
  title: string;
  body: string;
  organizationId?: string;
  userIds?: string[];
  data?: Record<string, unknown>;
};

type PreferenceRow = {
  user_id: string;
  receive_push: boolean;
  notify_purchase: boolean;
  notify_registration: boolean;
  notify_health_alert: boolean;
};

type PushTokenRow = {
  token: string;
  user_id: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notify-secret',
};

function shouldReceiveEvent(pref: PreferenceRow | null, eventType: EventType) {
  if (!pref) return true;
  if (!pref.receive_push) return false;
  if (eventType === 'purchase') return pref.notify_purchase;
  if (eventType === 'registration') return pref.notify_registration;
  if (eventType === 'health_alert') return pref.notify_health_alert;
  return true;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('NOTIFICATION_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: 'NOTIFICATION_WEBHOOK_SECRET is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const incoming = req.headers.get('x-notify-secret');
    if (!incoming || incoming !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload = (await req.json()) as RequestPayload;

    if (!payload.title?.trim() || !payload.body?.trim() || !payload.eventType) {
      return new Response(JSON.stringify({ error: 'eventType, title and body are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let targetUserIds: string[] = payload.userIds ?? [];

    if (targetUserIds.length === 0 && payload.organizationId) {
      const membershipResult = await supabase
        .from('organization_memberships')
        .select('user_id')
        .eq('organization_id', payload.organizationId);

      if (membershipResult.error) {
        return new Response(JSON.stringify({ error: membershipResult.error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      targetUserIds = (membershipResult.data ?? []).map((row) => row.user_id as string);
    }

    targetUserIds = Array.from(new Set(targetUserIds));

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, reason: 'No target users' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prefResult = await supabase
      .from('user_notification_preferences')
      .select('user_id, receive_push, notify_purchase, notify_registration, notify_health_alert')
      .in('user_id', targetUserIds);

    if (prefResult.error) {
      return new Response(JSON.stringify({ error: prefResult.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const preferences = new Map<string, PreferenceRow>();
    for (const row of prefResult.data ?? []) {
      preferences.set(row.user_id as string, row as PreferenceRow);
    }

    const optedInUserIds = targetUserIds.filter((userId) =>
      shouldReceiveEvent(preferences.get(userId) ?? null, payload.eventType)
    );

    if (optedInUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: targetUserIds.length, reason: 'All users opted out' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenResult = await supabase
      .from('user_push_tokens')
      .select('token, user_id')
      .eq('enabled', true)
      .in('user_id', optedInUserIds);

    if (tokenResult.error) {
      return new Response(JSON.stringify({ error: tokenResult.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokens = (tokenResult.data ?? []) as PushTokenRow[];
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: targetUserIds.length, reason: 'No registered devices' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (const tokenChunk of chunk(tokens, 100)) {
      const messages = tokenChunk.map((tokenRow) => ({
        to: tokenRow.token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: {
          eventType: payload.eventType,
          ...payload.data,
        },
      }));

      const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const expoJson = await expoResponse.json().catch(() => null) as
        | { data?: Array<{ status: string; details?: { error?: string } }> }
        | null;

      if (!expoResponse.ok || !expoJson?.data) {
        failed += tokenChunk.length;
        continue;
      }

      expoJson.data.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          sent += 1;
          return;
        }

        failed += 1;
        if (ticket.details?.error === 'DeviceNotRegistered') {
          const row = tokenChunk[index];
          if (row?.token) invalidTokens.push(row.token);
        }
      });
    }

    if (invalidTokens.length > 0) {
      await supabase.from('user_push_tokens').update({ enabled: false }).in('token', invalidTokens);
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        targetedUsers: targetUserIds.length,
        targetedDevices: tokens.length,
        disabledTokens: invalidTokens.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
