// Testdaten nur für die Vorschau (EXPO_PUBLIC_PREVIEW=1). Gleiche Form wie die echten Antworten.
import type { KioskLedgerResponse, KioskSalesResponse, MachineRevenue } from './kioskSales';
import type { HealthMachine } from './data';

function dayKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d);
}

const SOLD = [11, 9, 14, 22, 31, 6, 18, 7, 12, 25, 19, 34, 15, 8, 10, 16, 28, 21, 5, 13, 17, 24, 9, 12, 30, 26, 14, 7, 11, 19];
const TAKEN = [240, 190, 255, 410, 520, 150, 330, 170, 240, 460, 360, 590, 280, 190, 220, 300, 480, 400, 140, 260, 310, 430, 200, 250, 540, 470, 270, 160, 230, 350];

export function previewKioskSales(): KioskSalesResponse {
  const wd = (o: string, c: string) => ({ enabled: true, open: o, close: c, pauses: [] });
  return {
    isKioskPark: true,
    priceCents: 300,
    timezone: 'Europe/Berlin',
    openingHours: { mon: null, tue: ['11:00', '18:00'], wed: ['11:00', '18:00'], thu: ['11:00', '18:00'], fri: null, sat: ['10:00', '18:00'], sun: ['10:00', '18:00'] },
    openingHoursConfig: {
      season_start: '2026-03-21',
      season_end: '2026-10-25',
      weekdays: { mon: { ...wd('11:00', '18:00'), enabled: false }, tue: wd('11:00', '18:00'), wed: wd('11:00', '18:00'), thu: wd('11:00', '18:00'), fri: { ...wd('11:00', '18:00'), enabled: false }, sat: wd('10:00', '18:00'), sun: wd('10:00', '18:00') },
      exceptions: [],
    },
    days: SOLD.map((sold, i) => ({
      camera_code: '1717',
      business_date: dayKey(i),
      photos_sold_count: sold,
      photos_taken_count: TAKEN[i],
      min_file_code: null,
      max_file_code: null,
    })),
  };
}

export function previewMachineRevenue(): MachineRevenue[] {
  return [
    {
      machine_id: 'wingst-pc1',
      machine_label: 'Wingst Automat',
      is_active: true,
      card_only: true,
      heute: { anzahl: SOLD[0], cent: SOLD[0] * 300 },
      woche: { anzahl: 87, cent: 87 * 300 },
      monat: { anzahl: 331, cent: 331 * 300 },
      gesamt: { anzahl: 3120, cent: 3120 * 300 },
      karte_anzahl: 3120,
      bar_anzahl: 0,
      unbekannt_anzahl: 0,
    },
  ];
}

export function previewLedger(): KioskLedgerResponse {
  const now = Date.now();
  const names = ['Anna Becker', null, 'Jonas Weber', null, 'Mia Schulz', null, 'Leon Fischer', null];
  return {
    purchases: names.map((name, i) => ({
      machine_id: 'wingst-pc1',
      machine_label: 'Wingst Automat',
      sold_at: new Date(now - i * 23 * 60000).toISOString(),
      sold_local: null,
      bild_nr: String(412 - i * 3).padStart(4, '0'),
      print_count: null,
      method: i % 3 === 0 ? 'bar' : 'karte',
      method_source: 'terminal',
      card_scheme: i % 3 === 0 ? null : i % 2 ? 'Visa' : 'Mastercard',
      receipt_no: String(8800 + i),
      auth_code: null,
      amount_cents: 300,
      claimed_email: name ? `${name.split(' ')[0].toLowerCase()}@example.de` : null,
      claimed_name: name,
      photo_captured_at: new Date(now - i * 23 * 60000 - 90000).toISOString(),
    })),
    machines: [{ machine_id: 'wingst-pc1', machine_label: 'Wingst Automat', card_only: true }],
    priceCents: 300,
    truncated: false,
    from: dayKey(30),
    to: dayKey(0),
  };
}

export function previewHealth(): HealthMachine[] {
  return [
    {
      id: 'm1',
      machine_id: 'wingst-pc1',
      machine_label: 'Wingst Automat',
      reachable: true,
      offline_minutes: 1,
      last_seen_at: new Date(Date.now() - 40000).toISOString(),
      paper_remaining: 212,
      paper_capacity: 400,
      paper_warn_remaining: 30,
      queue_count: 0,
      disk_free_mb: 154000,
      agent_version: '0.2.2',
      card_only: true,
      customer_code: '1717',
      customer_code_registered: true,
      photos_taken_today: 307,
      photos_sold_today: 11,
      photo_conversion_today: 0.036,
      probes: [
        { name: 'Verkaufsprogramm', status: 'ok', detail: 'Läuft seit 3,2 Std.' },
        { name: 'Lichtschranke', status: 'ok', detail: 'Läuft seit 12,6 Std.' },
        { name: 'Kamera-Software', status: 'down', detail: 'Nicht gestartet' },
        { name: 'Drucker', status: 'ok', detail: 'Bereit, 0 Aufträge in der Warteschlange' },
        { name: 'Speicherplatz', status: 'ok', detail: '154 von 223 GB frei' },
      ],
      devices: [],
      coin_warnings: [],
      can_test_photo: true,
      camera_settings: {
        modell: 'DFK 33UX264',
        seriennummer: '46910412',
        videoformat: 'RGB32 (2448x2048)',
        fps: 30,
        quelle: 'C:/Liftpictures/kamera/settings.xml',
        programm: 'IC Capture',
        fehler: null,
        werte: {
          Exposure: { Auto: 1, Value: 0.0021, 'Auto Reference': 128 },
          Gain: { Auto: 1, 'Auto Max Value': 48 },
          Saturation: { Value: 100 },
          Gamma: { Value: 1 },
          Brightness: { Value: 0 },
          Contrast: { Value: 0 },
          Hue: { Value: 0 },
          WhiteBalance: { Auto: 1 },
          'Highlight Reduction': { Enable: 0 },
          'Tone Mapping': { Enable: 0 },
          Sharpness: { Value: 20 },
          Denoise: { Value: 10 },
        },
      },
    },
    {
      id: 'm2',
      machine_id: 'wingst-pc2',
      machine_label: 'Wingst Ausgang',
      reachable: false,
      offline_minutes: 190,
      last_seen_at: new Date(Date.now() - 190 * 60000).toISOString(),
      paper_remaining: 18,
      paper_capacity: 400,
      paper_warn_remaining: 30,
      queue_count: 4,
      agent_version: '0.2.2',
      card_only: false,
      probes: [],
      devices: [],
      coin_warnings: [{ cent: 100, stufe: 'knapp', text: '1-Euro-Münzen werden knapp' }],
    },
  ];
}

// ---- Systemzustand (Form wie operator-liftpic-health) ----
export function previewMachines() {
  const now = Date.now();
  return {
    machines: [
      {
        id: 'm1', machine_id: 'wingst-pc1', machine_label: 'Wingst Automat', last_seen_at: new Date(now - 40000).toISOString(), offline_minutes: 0, reachable: true,
        probes: [
          { name: 'Kamera-Software', kind: 'camera', status: 'ok', detail: 'Läuft', since_minutes: 410 },
          { name: 'Lichtschranke', kind: 'sensor', status: 'ok', detail: 'Läuft', since_minutes: 756 },
          { name: 'Verkaufsprogramm', kind: 'viewer', status: 'down', detail: 'Nicht gestartet' },
          { name: 'Drucker', kind: 'printer', status: 'ok', detail: 'Bereit, 0 Aufträge in der Warteschlange' },
          { name: 'Speicherplatz', kind: 'system', status: 'ok', detail: '154 von 223 GB frei' },
        ],
        devices: [
          { name: 'Kartenterminal', kind: 'terminal', status: 'ok', detail: 'Letzte Zahlung 15:31', idle_minutes: 30, plain: 'Letzte Kartenzahlung um 15:31 Uhr.' },
          { name: 'Uploader', kind: 'uploader', status: 'ok', detail: '0 in der Warteschlange', idle_minutes: 1 },
        ],
        restartable: [
          { key: 'viewer', name: 'Verkaufsprogramm', tech: 'PhotoViewerFacebook', folge: 'Der Bildschirm am Automaten ist etwa 20 Sekunden schwarz.' },
          { key: 'camera', name: 'Kamera-Software', tech: '3gerTis', folge: 'Für etwa 30 Sekunden werden keine Fotos aufgenommen.' },
        ],
        can_test_photo: true, customer_code: '1717', customer_code_registered: true,
        agent_version: '0.2.2', queue_count: 0, disk_free_mb: 154000, paper_remaining: 212, paper_capacity: 400, paper_warn_remaining: 30,
        photos_taken_today: 307, photos_sold_today: 11, pending_restart: null, last_restart_at: null, restart_poll_seconds: 20,
      },
    ],
    history: [
      { id: 1, machine_id: 'wingst-pc1', occurred_at: new Date(now - 3600000).toISOString(), severity: 'warning', summary: 'Verkaufsprogramm beendet', detail: 'PhotoViewerFacebook.exe' },
      { id: 2, machine_id: 'wingst-pc1', occurred_at: new Date(now - 7200000).toISOString(), severity: 'info', summary: 'Testfoto aufgenommen', detail: null },
    ],
  } as any;
}

const IMG = 'https://xcrxltiiovpoladpaewd.supabase.co/storage/v1/object/public/test/Copy%20of%20Copy%20of%20Photo-%20und%20Videosystems%20since%202006.jpg';
export function previewPhotos(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    externalCode: String(1717202610141500 + i * 37),
    imageUrl: IMG,
    capturedAt: new Date(Date.now() - i * 7 * 60000).toISOString(),
    isPaid: i % 4 === 0,
    speedKmh: 28 + ((i * 7) % 15),
    isTest: false,
  }));
}

export function previewSpeed(period: string) {
  const names = ['Leon', 'Mia', 'Jonas', 'Anna', null, 'Ben', null, 'Emma', 'Paul', 'Lina'];
  const rows = names.map((n, i) => ({
    id: `r${i}`, rank: i + 1, speedKmh: 41.8 - i * 1.3, capturedAt: new Date(Date.now() - i * 1800000).toISOString(),
    day: new Date().toISOString().slice(0, 10), email: n ? `${n.toLowerCase()}@example.de` : `gast${i}@example.de`, claimId: null, hidden: i === 6, displayName: n, avatarUrl: null, entries: [3, 1, 2, 1, 1, 2, 1, 1, 1, 1][i],
  }));
  return {
    enabled: true, period, date: new Date().toISOString().slice(0, 10), today: new Date().toISOString().slice(0, 10), from: null, to: null,
    rows, total: rows.length, repeat: { guests: 28, repeaters: 13, extraEntries: 17 }, stats: { count: 307, fastest: 41.8, slowest: 18.2, average: 31.4 },
    settings: { headline: 'Bestenliste', subline: '', cta_title: '', cta_text: '', winner_text: '', instagram_handle: '', hashtag: '', prize_text: '', show_qr: true, auto_scroll: true, rows: 10, max_speed_kmh: 60, periods: ['day', 'week', 'month', 'all'] },
  } as any;
}

export function previewTickets(archived: boolean) {
  if (archived) return [{ id: 't9', subject: 'Papier nachbestellt', description: 'Erledigt', status: 'closed', priority: 'low', archived_at: new Date().toISOString(), created_at: new Date(Date.now() - 9 * 86400000).toISOString(), updated_at: new Date().toISOString() }] as any;
  return [
    { id: 't1', subject: 'Kartenzahlung Wingst', description: 'Kartenzahlungen erscheinen nicht.', status: 'in_progress', priority: 'high', archived_at: null, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: 't2', subject: 'Logo auf dem Foto tauschen', description: 'Neues Saisonlogo.', status: 'open', priority: 'medium', archived_at: null, created_at: new Date(Date.now() - 3 * 86400000).toISOString(), updated_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  ] as any;
}
export function previewMessages(ticketId: string) {
  return [
    { id: 'a', ticket_id: ticketId, author_role: 'operator', message: 'Kartenzahlungen erscheinen nicht in der Übersicht.', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b', ticket_id: ticketId, author_role: 'support', message: 'Das Kartenterminal ist jetzt eingerichtet. Bitte einmal mit einer echten Karte testen.', created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  ] as any;
}

export function previewStaff() {
  return [
    { user_id: 'u1', email: 'kasse@spielpark-wingst.de', full_name: 'Kasse Spielpark', created_at: '2026-09-01', allowed_pages: ['photos', 'health'], role_label: 'Team', disabled_at: null, last_sign_in_at: new Date(Date.now() - 2 * 3600000).toISOString() },
    { user_id: 'u2', email: 'buchhaltung@spielpark-wingst.de', full_name: 'Petra Hansen', created_at: '2026-09-03', allowed_pages: ['overview', 'revenue', 'purchases'], role_label: 'Buchhaltung', disabled_at: null, last_sign_in_at: null },
  ] as any;
}

export function previewEquipment() {
  const it = (id: string, kategorie: string, titel: string, status: string, mehrwert_text: string | null, beschreibung: string) => ({
    id, kategorie, titel, beschreibung, status, geschaetzter_mehrumsatz_cents: null, mehrwert_text, bestellstatus: null, preview_url: null, sortierung: 0, image_url: IMG, before_image_url: null, after_image_url: null,
  });
  return [
    it('e1', 'Automat', 'Fotoautomat mit Münzprüfer', 'vorhanden', null, 'Verkauf direkt am Ausgang.'),
    it('e2', 'Verkauf', 'Kartenterminal', 'empfohlen', '890 € · 19 € / Monat', 'Gäste zahlen mit Karte oder Handy. Mehr Spontankäufe.'),
    it('e3', 'Kamera', 'Video-Kamera', 'empfohlen', '1.490 €', 'Kurzes Video der Fahrt zusätzlich zum Foto.'),
    it('e4', 'Zubehoer', 'Fotopapier 400 Drucke', 'empfohlen', '89 €', 'Thermo-Fotopapier für den Drucker DS-RX1.'),
  ] as any;
}
