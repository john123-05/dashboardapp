import { callShared } from './shared';
import { PREVIEW } from './preview';
import { getLanguage } from '../i18n';

// Marketing-CRM wie im Web: Umfrage, Freischalt-Weg, Social Media und Pixel (operator-survey),
// E-Mail (operator-email-campaigns), Kampagnen (operator-social-campaigns), Segmente (operator-contact-segments).

export type Localized = Record<string, string>;
export type QuestionType = 'nps' | 'stars' | 'yesno' | 'choice' | 'text';
export type UnlockMode = 'email' | 'survey' | 'social';
export type FieldLevel = 'off' | 'optional' | 'required';
export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube' | 'whatsapp';

export const pickLocalized = (v: Localized | null | undefined, lang: string = getLanguage()) => (v ? v[lang] || v.de || v.en || Object.values(v)[0] || '' : '');

export interface SocialSettings {
  platforms?: SocialPlatform[];
  handle?: string;
  hashtag?: string;
  instructions?: Localized;
  share_text?: Localized;
  giveaway_enabled?: boolean;
  giveaway_text?: Localized;
  post_link?: FieldLevel;
}
export interface SurveySettings {
  park_id: string;
  mode: UnlockMode;
  email_mode: FieldLevel;
  phone_mode: FieldLevel;
  address_mode: FieldLevel;
  social: SocialSettings;
  review_url: string | null;
  review_min_score: number;
  intro: Localized;
  review_text: Localized;
  thanks_text: Localized;
}
export interface SurveyQuestion { id?: string; type: QuestionType; prompt: Localized; options: Localized[]; required: boolean; is_score_question: boolean }
export interface SurveyConfig { settings: SurveySettings; questions: SurveyQuestion[] }

export interface SurveyQuestionResult {
  id: string;
  type: QuestionType;
  prompt: Localized;
  options: Localized[];
  active: boolean;
  is_score_question: boolean;
  answered: number;
  distribution?: { value: number; count: number }[];
  average?: number | null;
  yes?: number;
  no?: number;
  counts?: { index: number; count: number }[];
  texts?: { text: string; score: number | null; at: string }[];
}
export interface SurveyResults {
  days: number;
  total: number;
  scored: number;
  average_score: number | null;
  nps: number | null;
  promoters: number;
  detractors: number;
  passives: number;
  review_link_shown: number;
  review_min_score: number;
  distribution: { score: number; count: number }[];
  timeline: { day: string; count: number; avg_score: number | null }[];
  questions: SurveyQuestionResult[];
  truncated: boolean;
  languages?: string[];
  countries?: string[];
}
export interface TrackingSettings { meta_pixel_id: string; google_ads_id: string; enabled: boolean }

const survey = <T,>(opts: { method?: 'GET' | 'POST'; query?: Record<string, string | undefined>; body?: Record<string, unknown> }, parkId: string) =>
  callShared<T>('operator-survey', { method: opts.method ?? 'GET', query: { park_id: parkId, ...opts.query }, body: opts.body ? { park_id: parkId, ...opts.body } : undefined });

const mock = () => import('./mockMore');

export const fetchSurveyConfig = async (parkId: string) => (PREVIEW ? (await mock()).previewSurveyConfig() : survey<SurveyConfig>({}, parkId));
export const saveSurveyConfig = async (parkId: string, c: SurveyConfig) => (PREVIEW ? c : survey<SurveyConfig>({ method: 'POST', body: { settings: c.settings, questions: c.questions } }, parkId));
export const fetchSurveyResults = async (parkId: string, days: number, filter: { locale?: string; country?: string } = {}) =>
  PREVIEW ? (await mock()).previewSurveyResults(days) : survey<SurveyResults>({ query: { view: 'results', days: String(days), locale: filter.locale, country: filter.country } }, parkId);
export const setUnlockMode = async (parkId: string, mode: UnlockMode) =>
  PREVIEW ? { ...(await mock()).previewSurveyConfig(), settings: { ...(await mock()).previewSurveyConfig().settings, mode } } : survey<SurveyConfig>({ method: 'POST', body: { action: 'set_mode', mode } }, parkId);
export const saveContactSettings = async (parkId: string, email_mode: FieldLevel, phone_mode: FieldLevel, address_mode: FieldLevel) =>
  PREVIEW ? (await mock()).previewSurveyConfig() : survey<SurveyConfig>({ method: 'POST', body: { action: 'save_contact', email_mode, phone_mode, address_mode } }, parkId);
export const saveSocialSettings = async (parkId: string, social: SocialSettings) =>
  PREVIEW ? (await mock()).previewSurveyConfig() : survey<SurveyConfig>({ method: 'POST', body: { action: 'save_social', social } }, parkId);
export const fetchTracking = async (parkId: string) => (PREVIEW ? { meta_pixel_id: '', google_ads_id: '', enabled: false } : survey<TrackingSettings>({ query: { view: 'tracking' } }, parkId));
export const saveTracking = async (parkId: string, tracking: TrackingSettings) =>
  PREVIEW ? tracking : survey<TrackingSettings>({ method: 'POST', query: { view: 'tracking' }, body: { action: 'save_tracking', tracking } }, parkId);

export interface SocialEntry { id: string; name: string | null; email: string | null; phone: string | null; giveaway_opt_in: boolean; platform: string | null; handle: string | null; post_url: string | null; posted_at: string | null; created_at: string; country_code: string | null }
export interface SocialResults { days: number; unlocked: number; posted: number; with_link: number; giveaway: number; platforms: { platform: string; count: number }[]; timeline: { day: string; unlocked: number; posted: number }[]; entries: SocialEntry[]; truncated: boolean }
export const fetchSocialResults = async (parkId: string, days: number) =>
  PREVIEW ? (await mock()).previewSocialResults(days) : survey<SocialResults>({ query: { view: 'social', days: String(days) } }, parkId);

/** Startvorlage: Weiterempfehlung + Freitext (wie defaultQuestions im Web). */
export const defaultQuestions = (): SurveyQuestion[] => [
  { type: 'nps', prompt: { de: 'Wie wahrscheinlich ist es, dass du uns weiterempfiehlst?', en: 'How likely are you to recommend us to a friend?' }, options: [], required: true, is_score_question: true },
  { type: 'text', prompt: { de: 'Was hat dir besonders gefallen oder was können wir besser machen?', en: 'What did you like most, or what could we do better?' }, options: [], required: false, is_score_question: false },
];

// ---------------------------------------------------------------- E-Mail

export type EmailBlock = { type: 'heading'; text: string } | { type: 'text'; text: string } | { type: 'image'; url: string; alt: string } | { type: 'button'; label: string; url: string } | { type: 'divider' };
export type EmailStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export interface EmailCampaignSummary { id: string; name: string; subject: string; status: EmailStatus; scheduled_at: string | null; sent_at: string | null; recipients: number; opened: number; language: string | null; updated_at: string }
export interface EmailSettings { sender_name: string; reply_to: string; footer_address: string }
export type AutomationType = 'welcome' | 'season_start';
export interface EmailAutomation { type: AutomationType; enabled: boolean; campaign_id: string | null; delay_hours: number }
export interface EmailOverview { campaigns: EmailCampaignSummary[]; settings: EmailSettings | null; usage: { sent: number; quota: number; plan: string }; automations?: EmailAutomation[]; automations_allowed?: boolean; migration_pending?: boolean }
export interface EmailSegment { countries?: string[]; since?: string; segment_id?: string }
export type EmailDraft = { id?: string; template_for?: AutomationType; name: string; subject: string; preheader: string; language: string | null; body_json: EmailBlock[]; html: string; segment: EmailSegment };
export interface EmailCampaignFull extends EmailCampaignSummary { preheader: string; body_json: EmailBlock[]; html: string; segment: EmailSegment }

const email = <T,>(parkId: string, payload?: Record<string, unknown>, query: Record<string, string> = {}) =>
  callShared<T>('operator-email-campaigns', { method: payload ? 'POST' : 'GET', query: { park_id: parkId, ...query }, body: payload ? { park_id: parkId, ...payload } : undefined });

export const fetchEmailOverview = async (parkId: string) => (PREVIEW ? (await mock()).previewEmailOverview() : email<EmailOverview>(parkId));
export const fetchEmailCampaign = async (parkId: string, id: string) => (PREVIEW ? (await mock()).previewEmailCampaign(id) : email<{ campaign: EmailCampaignFull }>(parkId, undefined, { id }));
export const saveEmailCampaign = async (parkId: string, campaign: EmailDraft) => (PREVIEW ? { id: campaign.id ?? 'e-new' } : email<{ id: string }>(parkId, { action: 'save', campaign }));
export const deleteEmailCampaign = (parkId: string, id: string) => (PREVIEW ? Promise.resolve(null) : email<unknown>(parkId, { action: 'delete', id }));
export const saveEmailSettings = async (parkId: string, settings: EmailSettings) => (PREVIEW ? { settings } : email<{ settings: EmailSettings }>(parkId, { action: 'save_settings', settings }));
export const previewAudience = async (parkId: string, language: string | null, segment: EmailSegment) => (PREVIEW ? { count: 312 } : email<{ count: number }>(parkId, { action: 'preview_audience', language, segment }));
export const sendTestEmail = async (parkId: string, id: string) => (PREVIEW ? { to: 'vorschau@liftpictures.de' } : email<{ to: string }>(parkId, { action: 'test', id }));
export const sendEmailCampaign = async (parkId: string, id: string, scheduledAt?: string) => (PREVIEW ? { recipients: 312 } : email<{ recipients: number }>(parkId, { action: 'send', id, scheduled_at: scheduledAt }));
export const saveAutomation = async (parkId: string, type: AutomationType, enabled: boolean, delayHours: number) =>
  PREVIEW ? (await mock()).previewEmailOverview() : email<EmailOverview>(parkId, { action: 'save_automation', type, enabled, delay_hours: delayHours });
export const sendSeasonStart = async (parkId: string) => (PREVIEW ? { recipients: 312 } : email<{ recipients: number }>(parkId, { action: 'send_template' }));

export interface ContactSegment { id: string; name: string; member_count: number }
export const fetchSegments = async (parkId: string): Promise<ContactSegment[]> =>
  PREVIEW ? [] : ((await callShared<{ segments: ContactSegment[] }>('operator-contact-segments', { query: { park_id: parkId } })).segments ?? []);

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeUrl = (u: string) => (/^https:\/\//i.test(u.trim()) ? esc(u.trim()) : '');

/** Wie lib/emailHtml.ts im Web: Tabellenlayout, 600 px, Inline-Stile. Den Fuß hängt der Server an. */
export function blocksToHtml(blocks: EmailBlock[]): string {
  const rows = blocks
    .map((b) => {
      switch (b.type) {
        case 'heading':
          return `<tr><td style="padding:8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:bold;color:#1f2933;">${esc(b.text)}</td></tr>`;
        case 'text':
          return `<tr><td style="padding:8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#33475b;">${esc(b.text).replace(/\n/g, '<br/>')}</td></tr>`;
        case 'image': {
          const url = safeUrl(b.url);
          return url ? `<tr><td style="padding:8px 24px;"><img src="${url}" alt="${esc(b.alt)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;"/></td></tr>` : '';
        }
        case 'button': {
          const url = safeUrl(b.url);
          return url && b.label.trim()
            ? `<tr><td style="padding:12px 24px;"><a href="${url}" style="display:inline-block;background:#c2410c;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:6px;">${esc(b.label)}</a></td></tr>`
            : '';
        }
        case 'divider':
          return `<tr><td style="padding:12px 24px;"><div style="border-top:1px solid #dfe3eb;"></div></td></tr>`;
      }
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;"><tr><td align="center" style="padding:24px 8px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:8px;">${rows}</table></td></tr></table>`;
}

// ---------------------------------------------------------------- Social-Kampagnen

export type CampaignType = 'share_unlock' | 'giveaway' | 'record';
export type CampaignStatus = 'draft' | 'active' | 'ended';
export interface Campaign { id: string; name: string; type: CampaignType; status: CampaignStatus; hashtag: string | null; mention: string | null; prize: string | null; rules_text: Localized; starts_at: string | null; ends_at: string | null; winner_entry_id: string | null; drawn_at: string | null; created_at: string; entries_total?: number; entries_verified?: number }
export interface CampaignList { campaigns: Campaign[]; active_id: string | null; migration_pending?: boolean }
export interface CampaignEntry { id: string; name: string | null; handle: string | null; platform: string | null; post_url: string | null; giveaway_opt_in: boolean; verified_at: string | null; photo_rights: boolean; approved_at: string | null; created_at: string; email_masked: string | null; phone_masked: string | null; visitors: number }
export interface CampaignDetail { campaign: Campaign; entries: CampaignEntry[]; leaderboard: CampaignEntry[] }
export type CampaignDraft = Pick<Campaign, 'name' | 'type' | 'status' | 'hashtag' | 'mention' | 'prize' | 'rules_text' | 'starts_at' | 'ends_at'> & { id?: string };

const social = <T,>(parkId: string, payload?: Record<string, unknown>, query: Record<string, string> = {}) =>
  callShared<T>('operator-social-campaigns', { method: payload ? 'POST' : 'GET', query: { park_id: parkId, ...query }, body: payload ? { park_id: parkId, ...payload } : undefined });

export const fetchCampaigns = async (parkId: string) => (PREVIEW ? (await mock()).previewCampaigns() : social<CampaignList>(parkId));
export const fetchCampaign = async (parkId: string, id: string) => (PREVIEW ? (await mock()).previewCampaign(id) : social<CampaignDetail>(parkId, undefined, { campaign_id: id }));
export const saveCampaign = async (parkId: string, campaign: CampaignDraft) => (PREVIEW ? (await mock()).previewCampaigns() : social<CampaignList>(parkId, { action: 'save', campaign }));
export const verifyEntry = (parkId: string, entryId: string, verified: boolean) => (PREVIEW ? Promise.resolve(null) : social(parkId, { action: 'verify', entry_id: entryId, verified }));
export const approveEntry = (parkId: string, entryId: string, approved: boolean) => (PREVIEW ? Promise.resolve(null) : social(parkId, { action: 'approve', entry_id: entryId, approved }));
export const drawWinner = (parkId: string, campaignId: string, o: { redraw?: boolean; weighted?: boolean } = {}) =>
  PREVIEW ? Promise.resolve(null) : social(parkId, { action: 'draw', campaign_id: campaignId, ...o });
