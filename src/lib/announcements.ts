import { callShared } from './shared';
import { PREVIEW } from './preview';
import type { PageKey } from './permissions';

// Hinweise aus dem Liftpictures-CRM (park_announcements, Function operator-announcements), wie
// AnnouncementHost im Web: je Seite gezielt, einmal geschlossen = für diesen Nutzer weg.

export type Announcement = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  qr_url: string | null;
  pages: string[];
  audience: 'all' | 'owner' | 'staff';
  tone: 'info' | 'offer' | 'warning';
};

export async function fetchAnnouncements(parkId: string): Promise<Announcement[]> {
  if (PREVIEW) return [];
  const data = await callShared<{ announcements: Announcement[] }>('operator-announcements', { query: { park_id: parkId } });
  return data?.announcements ?? [];
}

const reported = new Set<string>();
export function reportAnnouncement(parkId: string, id: string, event: 'seen' | 'clicked' | 'dismissed') {
  if (PREVIEW) return;
  const key = `${id}:${event}`;
  if (event !== 'dismissed' && reported.has(key)) return;
  reported.add(key);
  void callShared('operator-announcements', { method: 'POST', body: { park_id: parkId, announcement_id: id, event }, raw: true }).catch(() => undefined);
}

export function announcementFor(items: Announcement[], page: PageKey | 'ratgeber', viewer: { isOwner: boolean; isStaff: boolean }, closed: string[]) {
  return (
    items.find(
      (a) =>
        !closed.includes(a.id) &&
        (a.pages.length === 0 || a.pages.includes(page)) &&
        (a.audience === 'all' || (a.audience === 'owner' ? viewer.isOwner : viewer.isStaff)),
    ) ?? null
  );
}
