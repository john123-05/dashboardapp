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
