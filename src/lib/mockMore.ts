// Testdaten der neuen Seiten, nur für die Vorschau (EXPO_PUBLIC_PREVIEW=1). Gleiche Form wie die echten Antworten.
import type { Catalog } from './catalog';
import type { CampaignDetail, CampaignList, EmailCampaignFull, EmailOverview, SocialResults, SurveyConfig, SurveyResults } from './crm';
import type { BrandingMachine, CurrentRef, Deployment, OverlayAsset, OverlayCampaign } from './overlays';
import type { ShopOverview } from './shop';

const IMG = 'https://xcrxltiiovpoladpaewd.supabase.co/storage/v1/object/public/test/Copy%20of%20Copy%20of%20Photo-%20und%20Videosystems%20since%202006.jpg';
const LOGO = 'https://kvpcwlcfgmsmarjtwpsx.supabase.co/storage/v1/object/public/test/liftpictures-logo.png';
const ago = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const day = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

export function previewOverlays(): { assets: OverlayAsset[]; campaigns: OverlayCampaign[] } {
  const assets = [0, 1, 2].map((i) => ({ id: `a${i}`, park_id: 'p', bucket: 'overlays', path: `p/overlay-${i}.png`, mime_type: 'image/png', width: 2362, height: 1772, created_at: ago(i * 30), preview_url: LOGO }));
  return { assets, campaigns: [{ id: 'c1', name: 'Sofort Overlay: overlay-0.png', status: 'active', starts_at: ago(2), layers: [{ id: 'l1', asset_id: 'a0', z_index: 10, opacity: 1, fit: 'fill', anchor: 'center', scale: 1 }] }] };
}

export function previewBranding(): { machines: BrandingMachine[]; assets: Deployment[]; refs: Record<string, CurrentRef>; notDeployed: boolean } {
  return {
    machines: [{ id: 'm1', machine_id: 'wingst-pc1', machine_label: 'Wingst Automat', last_seen_at: ago(0.02), pending_restart: null, last_restart_at: ago(20) }],
    assets: [{ id: 'd1', machine_id: 'wingst-pc1', slot: 'viewer_overlay_png', bucket: 'test', storage_path: 'x.png', updated_at: ago(26), created_at: ago(26), preview_url: LOGO }],
    refs: {},
    notDeployed: false,
  };
}

export function previewShop(): ShopOverview {
  const p = (key: string, label: string, cents: number, enabled: boolean) => ({ key, label, description: '', price_cents: cents, per_photo: true, enabled });
  return {
    settings: {
      price_cents: 900,
      accent_color: '#C6A233',
      logo_url: null,
      shop_name: 'Wingst Foto-Shop',
      welcome_text: '',
      font_family: 'system',
      demo_token: 'vorschau',
      activation_requested_at: null,
      products: [p('digital', 'Digitaler Download', 900, true), p('print', 'Fotoabzug', 1290, true), p('mug', 'Tasse', 1990, true), p('tshirt', 'T-Shirt', 2490, false), p('poster', 'Poster', 2990, false)],
    },
    revenue: { salesCount: 0, totalCents: 0 },
    redemptions: { total: 40, delayed: 13 },
  };
}

export function previewCatalog(): Catalog {
  const pkg = (key: string, grp: string, sort: number, name: string, cents: number | null, extra: Partial<Catalog['packages'][number]> = {}) => ({
    key, grp, sort, highlight: false, price_cents: cents, price_unit: 'month' as const, term_months: null, free_months: 0, setup_cents: null,
    texts: { de: { name } }, bullets: [], meta: {}, deal: null, ...extra,
  });
  return {
    packages: [
      pkg('basis', 'plan', 1, 'Basis', 0, { bullets: [{ texts: { de: 'Übersicht, Umsatz, Käufe und Fotos' }, included: true }, { texts: { de: 'Systemzustand und Kamera' }, included: true }] }),
      pkg('marketing_starter', 'plan', 2, 'Marketing Starter', 3900, {
        bullets: [{ texts: { de: 'Kontakte, Umfrage, Pixel' }, included: true }, { texts: { de: '2.000 E-Mails im Monat' }, included: true }],
        deal: { source: 'promotion', name: 'Saisonstart', promotion_id: null, percent: 20, fixed: false, extra_free_months: 1, valid_until: day(-20), list_price_cents: 4900, list_free_months: 0 },
      }),
      pkg('marketing_pro', 'plan', 3, 'Marketing Pro', 14900, { highlight: true, texts: { de: { name: 'Marketing Pro', badge: 'Empfohlen' } }, bullets: [{ texts: { de: 'Kampagnen und Gewinnspiele' }, included: true }, { texts: { de: 'Google-Bewertungen' }, included: true }] }),
      pkg('shop_monthly', 'shop', 1, 'Monatlich', 9900, { setup_cents: 74900 }),
      pkg('shop_full', 'shop', 2, 'Umsatzanteil', null, { price_unit: 'share', meta: { share_percent: 15 } }),
    ],
    points: [],
    cells: [],
    promotions: [{ id: 'pr1', name: 'Saisonstart', texts: { de: { title: 'Saisonstart', banner: '20 % auf Marketing Starter und einen Monat geschenkt.' } }, ends_on: day(-20) }],
    groups: [
      { key: 'plan', sort: 1, built_in: true, texts: { de: { name: 'Marketing' } } },
      { key: 'shop', sort: 2, built_in: true, texts: { de: { name: 'Online-Shop', sub: 'Drei Wege, den Shop freizuschalten.' } } },
    ],
  };
}

export function previewSurveyConfig(): SurveyConfig {
  return {
    settings: {
      park_id: 'p', mode: 'email', email_mode: 'required', phone_mode: 'optional', address_mode: 'off',
      social: { platforms: ['instagram', 'tiktok'], handle: '@spielpark_wingst', hashtag: '#wingst', post_link: 'optional', giveaway_enabled: false },
      review_url: 'https://g.page/r/wingst/review', review_min_score: 9, intro: { de: 'Zwei kurze Fragen, dann gehört das Foto dir.' }, review_text: {}, thanks_text: {},
    },
    questions: [
      { id: 'q1', type: 'nps', prompt: { de: 'Wie wahrscheinlich ist es, dass du uns weiterempfiehlst?' }, options: [], required: true, is_score_question: true },
      { id: 'q2', type: 'choice', prompt: { de: 'Wie hast du von uns erfahren?' }, options: [{ de: 'Empfehlung' }, { de: 'Social Media' }, { de: 'Internet' }, { de: 'Vor Ort' }], required: false, is_score_question: false },
      { id: 'q3', type: 'text', prompt: { de: 'Was können wir besser machen?' }, options: [], required: false, is_score_question: false },
    ],
  };
}

export function previewSurveyResults(days: number): SurveyResults {
  const dist = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => ({ score: s, count: [0, 0, 1, 0, 1, 2, 3, 6, 9, 11, 15][s] }));
  return {
    days, total: 48, scored: 48, average_score: 8.4, nps: 46, promoters: 26, detractors: 7, passives: 15, review_link_shown: 26, review_min_score: 9,
    distribution: dist,
    timeline: Array.from({ length: 14 }, (_, i) => ({ day: day(13 - i), count: [2, 4, 1, 6, 3, 0, 5, 4, 2, 7, 3, 1, 6, 4][i], avg_score: 8 + (i % 3) * 0.4 })),
    truncated: false,
    questions: [
      { id: 'q1', type: 'nps', prompt: { de: 'Wie wahrscheinlich ist es, dass du uns weiterempfiehlst?' }, options: [], active: true, is_score_question: true, answered: 48, average: 8.4, distribution: dist.map((d) => ({ value: d.score, count: d.count })) },
      { id: 'q2', type: 'choice', prompt: { de: 'Wie hast du von uns erfahren?' }, options: [{ de: 'Empfehlung' }, { de: 'Social Media' }, { de: 'Internet' }, { de: 'Vor Ort' }], active: true, is_score_question: false, answered: 41, counts: [{ index: 0, count: 17 }, { index: 1, count: 9 }, { index: 2, count: 6 }, { index: 3, count: 9 }] },
      {
        id: 'q3', type: 'text', prompt: { de: 'Was können wir besser machen?' }, options: [], active: true, is_score_question: false, answered: 5,
        texts: [
          { text: 'Super Bahn, das Foto ist mega geworden!', score: 10, at: ago(3) },
          { text: 'Die Wartezeit am Einstieg war lang.', score: 6, at: ago(20) },
          { text: 'Mehr Sitzplätze am Imbiss wären schön.', score: 8, at: ago(30) },
          { text: 'Alles top, kommen wieder.', score: 10, at: ago(50) },
          { text: 'Foto am Automaten war etwas teuer.', score: 7, at: ago(70) },
        ],
      },
    ],
  };
}

export function previewSocialResults(days: number): SocialResults {
  return {
    days, unlocked: 37, posted: 14, with_link: 9, giveaway: 11, truncated: false,
    platforms: [{ platform: 'instagram', count: 9 }, { platform: 'tiktok', count: 4 }, { platform: 'facebook', count: 1 }],
    timeline: Array.from({ length: 14 }, (_, i) => ({ day: day(13 - i), unlocked: [2, 3, 1, 4, 2, 0, 5, 3, 2, 6, 3, 1, 3, 2][i], posted: [1, 1, 0, 2, 1, 0, 2, 1, 1, 2, 1, 0, 1, 1][i] })),
    entries: [
      { id: 's1', name: 'Mia Schulz', email: 'mia@example.de', phone: null, giveaway_opt_in: true, platform: 'instagram', handle: '@mia.s', post_url: 'https://instagram.com/p/xyz', posted_at: ago(4), created_at: ago(4), country_code: 'DE' },
      { id: 's2', name: 'Jonas Weber', email: 'jonas@example.de', phone: null, giveaway_opt_in: false, platform: 'tiktok', handle: '@jonasw', post_url: null, posted_at: ago(9), created_at: ago(9), country_code: 'DE' },
    ],
  };
}

export function previewEmailOverview(): EmailOverview {
  return {
    campaigns: [
      { id: 'e1', name: 'Herbstferien', subject: 'Deine Herbstferien im Spielpark', status: 'sent', scheduled_at: null, sent_at: ago(72), recipients: 284, opened: 131, language: null, updated_at: ago(72) },
      { id: 'e2', name: 'Saisonende', subject: 'Letzte Chance vor der Winterpause', status: 'draft', scheduled_at: null, sent_at: null, recipients: 0, opened: 0, language: 'de', updated_at: ago(2) },
    ],
    settings: { sender_name: 'Spielpark Wingst', reply_to: 'info@spielpark-wingst.de', footer_address: 'Spielpark Wingst, Hasenbeckallee 5, 21789 Wingst' },
    usage: { sent: 284, quota: 2000, plan: 'marketing_starter' },
    automations: [{ type: 'welcome', enabled: true, campaign_id: 'e3', delay_hours: 1 }],
    automations_allowed: false,
  };
}

export function previewEmailCampaign(id: string): { campaign: EmailCampaignFull } {
  const o = previewEmailOverview().campaigns.find((c) => c.id === id) ?? previewEmailOverview().campaigns[1];
  return { campaign: { ...o, preheader: 'Noch bis Sonntag geöffnet', segment: {}, html: '', body_json: [{ type: 'heading', text: 'Hallo {{name}}!' }, { type: 'text', text: 'Noch bis Sonntag hat {{park}} geöffnet. Komm vorbei!' }, { type: 'button', label: 'Öffnungszeiten', url: 'https://spielpark-wingst.de' }] } };
}

export function previewCampaigns(): CampaignList {
  return {
    active_id: 'k1',
    campaigns: [{ id: 'k1', name: 'Herbst-Gewinnspiel', type: 'giveaway', status: 'active', hashtag: '#wingst', mention: '@spielpark_wingst', prize: 'Familien-Freikarte', rules_text: {}, starts_at: ago(200), ends_at: new Date(Date.now() + 9 * 86400000).toISOString(), winner_entry_id: null, drawn_at: null, created_at: ago(200), entries_total: 12, entries_verified: 7 }],
  };
}

export function previewCampaign(id: string): CampaignDetail {
  const campaign = previewCampaigns().campaigns.find((c) => c.id === id) ?? previewCampaigns().campaigns[0];
  const entries = ['Mia Schulz', 'Leon Fischer', 'Emma Wagner'].map((name, i) => ({ id: `ce${i}`, name, handle: `@${name.split(' ')[0].toLowerCase()}`, platform: 'instagram', post_url: 'https://instagram.com/p/xyz', giveaway_opt_in: true, verified_at: i < 2 ? ago(5) : null, photo_rights: i !== 1, approved_at: i === 0 ? ago(3) : null, created_at: ago(10 + i * 8), email_masked: `${name[0].toLowerCase()}***@example.de`, phone_masked: null, visitors: [7, 3, 1][i] }));
  return { campaign, entries, leaderboard: entries.slice().sort((a, b) => b.visitors - a.visitors) };
}
