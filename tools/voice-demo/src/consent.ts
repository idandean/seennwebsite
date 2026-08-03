/**
 * Pre-flight recording consent for the public demo.
 *
 * ---------------------------------------------------------------------------
 * THIS IS NOT THE SERVER-DRIVEN CONSENT PATH
 * ---------------------------------------------------------------------------
 * `contract.ts` / `client.ts` already model a consent block the *server* can
 * demand mid-request, and the widget renders that wording verbatim because
 * consent text is a legal artefact that belongs with whoever versions it.
 * That machinery is untouched and still unused in v1.
 *
 * This module is the other half: a gate that runs *before* anything happens at
 * all. The visitor is told the demo is recorded and has to agree before the
 * browser asks for a microphone, calls Turnstile, POSTs to Supabase, imports
 * livekit-client or joins a room. Because it must render before any request
 * exists, the wording has to ship with the widget — there is nobody to ask.
 *
 * It is off unless `recordingConsentMode: 'required'` is set in the page's
 * config block, and the committed pages do not set it. Today's demo does not
 * record anything, so switching this on before the backend records would be a
 * lie told to visitors — see CONFIGURATION.md §7.
 *
 * Consent is held in memory for exactly one session. It is deliberately not
 * persisted: a checkbox someone ticked last week is not informed consent for
 * a microphone opening now, and `localStorage` would survive a policy change.
 */

import type { DemoLocale } from './contract';

export type RecordingConsentMode = 'disabled' | 'required';

/**
 * Bump whenever the wording below changes in any locale.
 *
 * Approvals are matched on this, so a bump invalidates every approval already
 * given in the current page session — which is the point: someone agreed to
 * the old sentence, not the new one.
 */
export const RECORDING_POLICY_VERSION = '2026-08-03.1';

export interface ConsentStrings {
  /** The disclosure sentence. The lock icon and the separator are chrome. */
  disclosure: string;
  /** Text link at the end of the disclosure line. Opens the dialog. */
  detailsLabel: string;

  dialogTitle: string;
  /** Two paragraphs, kept separate so neither can be silently reflowed away. */
  dialogBodyPrimary: string;
  dialogBodySecondary: string;

  privacyLabel: string;
  /** Dismisses without starting anything. */
  goBackLabel: string;
  /** The only affirmative control. */
  agreeLabel: string;
}

/**
 * Wording is exact and reviewed. Do not paraphrase, do not "improve" — change
 * it and bump RECORDING_POLICY_VERSION in the same commit.
 */
export const CONSENT_STRINGS: Record<DemoLocale, ConsentStrings> = {
  en: {
    disclosure: 'This demo is recorded and transcribed, then automatically deleted after 7 days',
    detailsLabel: 'Details',
    dialogTitle: 'Before we begin',
    dialogBodyPrimary: 'This demo is recorded and transcribed for review and improvement.',
    dialogBodySecondary: 'The recording and transcript are automatically deleted after 7 days.',
    privacyLabel: 'Privacy policy',
    goBackLabel: 'Go back',
    agreeLabel: 'Agree and start',
  },
  he: {
    disclosure: 'ההדגמה מוקלטת ומתומללת ונמחקת אוטומטית לאחר 7 ימים',
    detailsLabel: 'פרטים',
    dialogTitle: 'לפני שמתחילים',
    dialogBodyPrimary: 'ההדגמה מוקלטת ומתומללת לצורכי בדיקה ושיפור.',
    dialogBodySecondary: 'ההקלטה והתמלול נמחקים אוטומטית לאחר 7 ימים.',
    privacyLabel: 'מדיניות פרטיות',
    goBackLabel: 'חזרה',
    agreeLabel: 'מאשרים ומתחילים',
  },
  ar: {
    disclosure: 'يتم تسجيل العرض التجريبي وتفريغه نصيًا، ويُحذف تلقائيًا بعد 7 أيام',
    detailsLabel: 'التفاصيل',
    dialogTitle: 'قبل أن نبدأ',
    dialogBodyPrimary: 'يتم تسجيل العرض التجريبي وتفريغه نصيًا لأغراض المراجعة والتحسين.',
    dialogBodySecondary: 'يُحذف التسجيل والنص تلقائيًا بعد 7 أيام.',
    privacyLabel: 'سياسة الخصوصية',
    goBackLabel: 'رجوع',
    agreeLabel: 'موافقة وبدء',
  },
};

/** Where "Privacy policy" points, per locale. Same-site pages that exist. */
export const PRIVACY_POLICY_URLS: Record<DemoLocale, string> = {
  en: '/privacy-policy.html',
  he: '/he/privacy-policy.html',
  ar: '/privacy-policy.html',
};

export function consentStringsFor(locale: DemoLocale): ConsentStrings {
  return CONSENT_STRINGS[locale] ?? CONSENT_STRINGS.en;
}

/**
 * Proof that a specific visitor agreed to a specific wording, in a specific
 * language, at a specific moment.
 *
 * Nothing sends this anywhere yet. The backend's request validation is strict
 * and its consent field names are not agreed, so inventing them would produce
 * a request that fails — see BACKEND-CONTRACT.md §3.
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
 * Exact match, like `publicDemoMode`: this gate is the only thing standing
 * between a visitor and a recorded microphone, so a typo must fail closed to
 * 'disabled' rather than be guessed into 'required'.
 */
export function resolveConsentMode(raw: unknown): RecordingConsentMode {
  return raw === 'required' ? 'required' : 'disabled';
}

/**
 * Holds at most one approval, for at most one session.
 *
 * Not a store and not a cache. `take()` is destructive on purpose: consent
 * covers the session about to start and nothing after it.
 */
export class ConsentGate {
  private receipt: ConsentReceipt | null = null;

  constructor(
    private readonly mode: RecordingConsentMode,
    private locale: DemoLocale,
    private readonly policyVersion: string = RECORDING_POLICY_VERSION,
  ) {}

  /** True when a visitor must agree before anything may happen. */
  get required(): boolean {
    return this.mode === 'required';
  }

  /**
   * A held approval only counts for the wording and language it was given
   * for. Switching either throws it away rather than carrying it over.
   */
  get approved(): boolean {
    if (!this.required) return true;
    const held = this.receipt;
    return (
      held !== null && held.policyVersion === this.policyVersion && held.locale === this.locale
    );
  }

  /**
   * Records an affirmative decision. Idempotent: clicking the button twice
   * before the dialog closes must not produce a second approval, because the
   * caller turns each approval into exactly one session.
   */
  approve(now: Date = new Date()): ConsentReceipt {
    if (this.approved && this.receipt) return this.receipt;
    this.receipt = {
      policyVersion: this.policyVersion,
      locale: this.locale,
      acceptedAt: now.toISOString(),
    };
    return this.receipt;
  }

  /** Consumes the approval. The next session needs a fresh one. */
  take(): ConsentReceipt | null {
    const held = this.receipt;
    this.receipt = null;
    return held;
  }

  /** Drops any held approval without consuming it as a session. */
  revoke(): void {
    this.receipt = null;
  }

  /**
   * Re-points the gate at a different language. Any approval given in the old
   * one stops counting, because it was given to a sentence the visitor can no
   * longer see.
   */
  setLocale(locale: DemoLocale): void {
    if (locale === this.locale) return;
    this.locale = locale;
    this.receipt = null;
  }

  get currentLocale(): DemoLocale {
    return this.locale;
  }
}
