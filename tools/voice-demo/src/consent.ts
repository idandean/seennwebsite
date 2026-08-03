/**
 * Pre-flight recording consent for the public demo.
 *
 * ---------------------------------------------------------------------------
 * THE WORDING IS NOT OURS
 * ---------------------------------------------------------------------------
 * The sentence a visitor agrees to is a legal artefact. It lives in the
 * backend's immutable consent catalog, versioned there, and this module renders
 * whatever the catalog returns — verbatim, or not at all. Nothing in this file
 * contains consent wording, and nothing may reconstruct it: a widget that can
 * invent the sentence can also drift from the one the acceptance is recorded
 * against.
 *
 * What does live here is chrome — the dialog title, the two button labels, the
 * link to the privacy page. Those are UI, not the thing being consented to.
 *
 * One consequence worth stating plainly: the catalog GET is the ONLY backend
 * request permitted before acceptance. Nothing else — no session POST, no
 * Turnstile execution, no microphone, no LiveKit — may happen until the visitor
 * has pressed the affirmative button.
 *
 * Acceptance is held in memory for exactly one session. It is deliberately not
 * persisted: a box ticked last week is not informed consent for a microphone
 * opening now, and storage would survive a policy change it never covered.
 */

import type { DemoLocale } from './contract';

export type RecordingConsentMode = 'disabled' | 'required';

/**
 * The version this build knows how to render and submit.
 *
 * Pinned, not discovered. If the catalog serves anything else the gate fails
 * closed rather than showing text for one version and recording an acceptance
 * against another — see `readCatalogEntry`.
 *
 * .2 covers audio recording *and* transcription. .1 was recording-only and is
 * retired; no code path may submit it.
 */
export const CONSENT_POLICY_VERSION = '2026-08-03.2';

/** Chrome around the catalog's sentence. Never the sentence itself. */
export interface ConsentStrings {
  /** Teaser under the start button. Summary, not the consent itself. */
  disclosure: string;
  detailsLabel: string;
  dialogTitle: string;
  privacyLabel: string;
  goBackLabel: string;
  /**
   * The affirmative control.
   *
   * The catalog's sentence quotes this label back at the visitor ("By selecting
   * 'Agree and start,' I consent to…"), so it is not free text: change it and
   * the sentence stops describing the button it names.
   */
  agreeLabel: string;
}

export const CONSENT_STRINGS: Record<DemoLocale, ConsentStrings> = {
  en: {
    disclosure: 'This demo is recorded and transcribed, then automatically deleted after 7 days',
    detailsLabel: 'Details',
    dialogTitle: 'Before we begin',
    privacyLabel: 'Privacy policy',
    goBackLabel: 'Go back',
    agreeLabel: 'Agree and start',
  },
  he: {
    disclosure: 'ההדגמה מוקלטת ומתומללת ונמחקת אוטומטית לאחר 7 ימים',
    detailsLabel: 'פרטים',
    dialogTitle: 'לפני שמתחילים',
    privacyLabel: 'מדיניות פרטיות',
    goBackLabel: 'חזרה',
    agreeLabel: 'הסכמה והתחלה',
  },
  ar: {
    disclosure: 'يتم تسجيل العرض التجريبي وتفريغه نصيًا، ويُحذف تلقائيًا بعد 7 أيام',
    detailsLabel: 'التفاصيل',
    dialogTitle: 'قبل أن نبدأ',
    privacyLabel: 'سياسة الخصوصية',
    goBackLabel: 'رجوع',
    agreeLabel: 'أوافق وأبدأ',
  },
};

export const PRIVACY_POLICY_URLS: Record<DemoLocale, string> = {
  en: '/privacy-policy.html',
  he: '/he/privacy-policy.html',
  ar: '/privacy-policy.html',
};

export function consentStringsFor(locale: DemoLocale): ConsentStrings {
  return CONSENT_STRINGS[locale] ?? CONSENT_STRINGS.en;
}

/** One immutable catalog row, as served for a single locale. */
export interface ConsentCatalogEntry {
  policyVersion: string;
  locale: DemoLocale;
  /** Rendered verbatim as plain text. Never parsed, never interpolated. */
  text: string;
}

export type CatalogResult =
  | { status: 'ok'; entry: ConsentCatalogEntry }
  | { status: 'failed'; reason: string };

function isLocale(value: unknown): value is DemoLocale {
  return value === 'en' || value === 'he' || value === 'ar';
}

/**
 * Validates a catalog payload. Every branch here is a refusal to show a
 * consent dialog we cannot stand behind.
 */
export function readCatalogEntry(
  payload: unknown,
  requested: DemoLocale,
  expectedVersion: string,
): CatalogResult {
  if (typeof payload !== 'object' || payload === null) {
    return { status: 'failed', reason: 'catalog response was not an object' };
  }

  const row = payload as Record<string, unknown>;
  const text = row['text'];
  const version = row['policy_version'];
  const locale = row['locale'];

  if (typeof text !== 'string' || text.trim() === '') {
    return { status: 'failed', reason: 'catalog entry has no consent text' };
  }
  if (typeof version !== 'string' || version.trim() === '') {
    return { status: 'failed', reason: 'catalog entry has no policy version' };
  }

  // Pinned, both directions. An older catalog would have us record acceptance
  // of a sentence this build cannot render; a newer one would have us show a
  // sentence we then misattribute to the version we submit.
  if (version !== expectedVersion) {
    return {
      status: 'failed',
      reason: `catalog served policy ${version}, this build renders ${expectedVersion}`,
    };
  }

  // The sentence has to be in the language the session will run in, or the
  // visitor agreed to something they could not read.
  if (!isLocale(locale) || locale !== requested) {
    return { status: 'failed', reason: 'catalog entry locale does not match the requested locale' };
  }

  return { status: 'ok', entry: { policyVersion: version, locale, text } };
}

export interface CatalogFetchOptions {
  /** Absolute URL of the catalog endpoint, without the locale query. */
  url: string;
  locale: DemoLocale;
  anonKey: string;
  expectedVersion?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * The one backend request allowed before acceptance.
 *
 * Read-only, no credentials beyond the publishable key, and bounded: a catalog
 * that hangs must not leave a visitor staring at a button that does nothing.
 */
export async function fetchConsentCatalog(options: CatalogFetchOptions): Promise<CatalogResult> {
  const expectedVersion = options.expectedVersion ?? CONSENT_POLICY_VERSION;
  const doFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? 4000;

  if (!options.url || !options.anonKey) {
    return { status: 'failed', reason: 'consent catalog is not configured' };
  }

  let url: string;
  try {
    const parsed = new URL(options.url);
    parsed.searchParams.set('locale', options.locale);
    parsed.searchParams.set('policy_version', expectedVersion);
    url = parsed.toString();
  } catch {
    return { status: 'failed', reason: 'consent catalog URL is not a valid URL' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await doFetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      headers: { apikey: options.anonKey },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { status: 'failed', reason: `catalog request failed with ${response.status}` };
    }

    const payload: unknown = await response.json();
    return readCatalogEntry(payload, options.locale, expectedVersion);
  } catch {
    // Deliberately not surfaced: the cause can carry network detail.
    return { status: 'failed', reason: 'catalog request could not be completed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Proof that a visitor agreed to a specific catalog row.
 *
 * Sent nested under `consent`, exactly these three fields, snake-cased by the
 * client. Not flattened, nothing added — the endpoint's validation is strict
 * and this shape is the agreed contract.
 */
export interface ConsentReceipt {
  policyVersion: string;
  locale: DemoLocale;
  /** ISO-8601, UTC. */
  acceptedAt: string;
}

/**
 * Recognises an explicit "required".
 *
 * Exact match, like `publicDemoMode`: this gate is the only thing between a
 * visitor and a recorded microphone, so a typo must fail closed.
 */
export function resolveConsentMode(raw: unknown): RecordingConsentMode {
  return raw === 'required' ? 'required' : 'disabled';
}

/**
 * Holds at most one acceptance, for at most one session.
 *
 * Nothing is selected by default and nothing is remembered: a fresh catalog
 * row must be fetched and a fresh affirmative act performed for every session.
 */
export class ConsentGate {
  private entry: ConsentCatalogEntry | null = null;
  private receipt: ConsentReceipt | null = null;

  constructor(
    private readonly mode: RecordingConsentMode,
    private readonly policyVersion: string = CONSENT_POLICY_VERSION,
  ) {}

  get required(): boolean {
    return this.mode === 'required';
  }

  /** The catalog row currently on screen, if the dialog is showing one. */
  get pending(): ConsentCatalogEntry | null {
    return this.entry;
  }

  /** Arms the gate with a validated catalog row. Clears any prior acceptance. */
  present(entry: ConsentCatalogEntry): void {
    this.entry = entry;
    this.receipt = null;
  }

  get approved(): boolean {
    if (!this.required) return true;
    const held = this.receipt;
    return held !== null && held.policyVersion === this.policyVersion;
  }

  /**
   * Records the affirmative act against the row that was actually shown.
   * Idempotent, so a double click cannot yield two acceptances.
   */
  approve(now: Date = new Date()): ConsentReceipt | null {
    if (this.receipt) return this.receipt;
    const shown = this.entry;
    if (!shown || shown.policyVersion !== this.policyVersion) return null;

    this.receipt = {
      policyVersion: shown.policyVersion,
      locale: shown.locale,
      acceptedAt: now.toISOString(),
    };
    return this.receipt;
  }

  /** Consumes the acceptance. The next session needs a fresh one. */
  take(): ConsentReceipt | null {
    const held = this.receipt;
    this.receipt = null;
    this.entry = null;
    return held;
  }

  /** Drops everything — used when the dialog is dismissed. */
  revoke(): void {
    this.receipt = null;
    this.entry = null;
  }
}
