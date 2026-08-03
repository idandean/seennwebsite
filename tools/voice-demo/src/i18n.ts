/**
 * Widget copy in English, Hebrew and Arabic.
 *
 * The widget owns its strings rather than joining the site's `translations`
 * object in js/script.js, for two reasons: that object is loaded by a
 * non-deferred script the widget must not depend on, and it has no Arabic —
 * the site ships EN at the root and HE under /he/, with no Arabic pages at all.
 * Arabic is therefore widget-only for now: reachable by explicit locale
 * config, not by any existing page.
 *
 * Recording-consent wording is deliberately absent. It arrives from the server
 * already localised, and the widget renders it verbatim.
 */

import type { DemoLocale } from './contract';

export type Direction = 'ltr' | 'rtl';

export const RTL_LOCALES: readonly DemoLocale[] = ['he', 'ar'];

export function directionFor(locale: DemoLocale): Direction {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}

/**
 * Resolves the locale the widget should render and request a session in.
 * Config wins; otherwise the page's own `lang` decides, so the widget follows
 * the site rather than guessing from the browser.
 */
export function resolveLocale(
  configured: DemoLocale | null,
  documentLang: string | null | undefined,
): DemoLocale {
  if (configured && isSupported(configured)) return configured;

  const lang = (documentLang ?? '').toLowerCase();
  if (lang.startsWith('he') || lang.startsWith('iw')) return 'he';
  if (lang.startsWith('ar')) return 'ar';
  return 'en';
}

export function isSupported(value: string): value is DemoLocale {
  return value === 'en' || value === 'he' || value === 'ar';
}

export interface Strings {
  /** Small label in the card header. */
  heroEyebrow: string;
  /** Right side of the card header. */
  durationBadge: string;
  /** The labelled control. Secondary to the page's own "Request a Demo". */
  startButton: string;
  /** Expectation-setting line under the button. */
  sessionMeta: string;

  unavailableTitle: string;
  unavailableBody: string;

  readyTitle: string;
  readyBody: string;
  startLabel: string;

  micTitle: string;
  micBody: string;

  connectingTitle: string;
  connectingBody: string;

  listeningTitle: string;
  listeningBody: string;

  thinkingTitle: string;
  thinkingBody: string;

  speakingTitle: string;
  speakingBody: string;

  reconnectingTitle: string;
  reconnectingBody: string;

  finishedTitle: string;
  finishedBody: string;
  signupCta: string;
  restart: string;

  rateLimitedVisitorTitle: string;
  rateLimitedVisitorBody: string;
  rateLimitedCapacityTitle: string;
  rateLimitedCapacityBody: string;

  errorTitle: string;
  retry: string;
  disconnect: string;
  timeRemaining: string;


  supportIdLabel: string;
  supportCopy: string;
  supportCopied: string;

  /** Consent panel chrome only — the notice itself comes from the server. */
  consentHeading: string;
  consentAccept: string;
  consentDecline: string;
  consentPolicyLink: string;

  err_microphone_denied: string;
  err_microphone_denied_hint: string;
  err_microphone_unavailable: string;
  err_language_unavailable: string;
  err_browser_unsupported: string;
  err_network_error: string;
  err_contract_violation: string;
  err_agent_unavailable: string;
  err_agent_lost: string;
  err_transport_failed: string;
  err_reconnect_failed: string;
  err_consent_declined: string;
  err_session_expired_before_start: string;
  err_demo_disabled: string;
  err_demo_unavailable: string;
  err_demo_capacity_reached: string;
  err_rate_limited: string;
  err_verification_failed: string;
  err_consent_required: string;
  err_invalid_request: string;
  err_server_error: string;
}

const en: Strings = {
  heroEyebrow: 'Talk to Jess — live',
  durationBadge: '~2 min',
  startButton: 'Talk to the AI Collection Agent',
  sessionMeta: '~2 min  ·  Microphone required',

  unavailableTitle: 'The voice demo is not available right now',
  unavailableBody: 'It will be back shortly.',

  readyTitle: 'Try the agent yourself',
  readyBody: 'Play the overdue customer.',
  startLabel: 'Start the voice demo',

  micTitle: 'Allow your microphone',
  micBody: 'Your browser is asking for permission. The demo cannot hear you until you allow it.',

  connectingTitle: 'Connecting you to the secretary…',
  connectingBody: 'Waiting for her to pick up.',

  listeningTitle: 'She is listening',
  listeningBody: 'Talk normally — she will answer you.',

  thinkingTitle: 'She is thinking',
  thinkingBody: 'Working out what to say next.',

  speakingTitle: 'She is speaking',
  speakingBody: 'Interrupt her whenever you like.',

  reconnectingTitle: 'Reconnecting…',
  reconnectingBody: 'The connection dropped. Trying to pick the call back up.',

  finishedTitle: 'That was our AI secretary.',
  finishedBody: 'She does this for real invoices, on real phone calls, every day — following your rules.',
  signupCta: 'Request a Demo',
  restart: 'Talk to her again',

  rateLimitedVisitorTitle: 'You have had a few goes already',
  rateLimitedVisitorBody: 'Give it a few minutes before trying the demo again.',
  rateLimitedCapacityTitle: 'Everyone wants a word with her',
  rateLimitedCapacityBody: 'The live demo is at capacity right now. Try again a little later — or skip the queue and put her to work on your own invoices.',

  errorTitle: 'That didn’t connect',
  retry: 'Try again',
  disconnect: 'End the call',
  timeRemaining: 'left',


  supportIdLabel: 'Support ID',
  supportCopy: 'Copy',
  supportCopied: 'Copied',

  consentHeading: 'Before we begin',
  consentAccept: 'I agree — start the call',
  consentDecline: 'No thanks',
  consentPolicyLink: 'Read the full policy',

  err_microphone_denied: 'Microphone blocked.',
  err_microphone_denied_hint: 'Click the padlock in your browser’s address bar, set Microphone to “Allow”, then reload this page.',
  err_microphone_unavailable: 'We couldn’t reach your microphone. Check that no other app is using it.',
  err_browser_unsupported: 'This browser can’t run the voice demo. Try Chrome, Edge or Safari.',
  err_network_error: 'We couldn’t reach the demo. Check your connection and try again.',
  err_contract_violation: 'The demo replied with something we couldn’t use. Our team has been notified.',
  err_agent_unavailable: 'The secretary didn’t pick up. Please try again.',
  err_agent_lost: 'The secretary dropped off the call. Please try again.',
  err_transport_failed: 'We couldn’t join the call.',
  err_reconnect_failed: 'We lost the connection and couldn’t get it back.',
  err_consent_declined: 'No problem — the demo did not start.',
  err_session_expired_before_start: 'That demo session expired before it started. Try again.',
  err_demo_disabled: 'The live demo is switched off at the moment.',
  err_demo_unavailable: 'The demo is temporarily unavailable.',
  err_demo_capacity_reached: 'The demo is at capacity right now.',
  err_rate_limited: 'Too many attempts. Try again shortly.',
  err_verification_failed: 'We couldn’t verify your browser. Reload the page and try again.',
  err_consent_required: 'The demo needs your agreement before it can start.',
  err_invalid_request: 'The demo is misconfigured — our team has been notified.',
  err_server_error: 'Something went wrong on our side.',
  err_language_unavailable: 'We could not choose the opening language. Please try again.',
};

const he: Strings = {
  heroEyebrow: 'ג׳ס — בשידור חי',
  durationBadge: '~2 דק׳',
  startButton: 'דברו עם סוכן הגבייה החכם',
  sessionMeta: '~2 דק׳  ·  נדרש מיקרופון',

  unavailableTitle: 'הדמו הקולי אינו זמין כרגע',
  unavailableBody: 'הוא יחזור בקרוב.',

  readyTitle: 'נסו את הסוכנת בעצמכם',
  readyBody: 'שחקו את הלקוח שבאיחור.',
  startLabel: 'התחילו את הדמו הקולי',

  micTitle: 'אשרו גישה למיקרופון',
  micBody: 'הדפדפן מבקש הרשאה. בלי אישור הדמו לא יוכל לשמוע אתכם.',

  connectingTitle: 'מחברים אתכם למזכירה…',
  connectingBody: 'ממתינים שהיא תענה.',

  listeningTitle: 'היא מקשיבה',
  listeningBody: 'דברו רגיל — היא תענה לכם.',

  thinkingTitle: 'היא חושבת',
  thinkingBody: 'מנסחת את התשובה.',

  speakingTitle: 'היא מדברת',
  speakingBody: 'אפשר להפריע לה בכל רגע.',

  reconnectingTitle: 'מתחברים מחדש…',
  reconnectingBody: 'החיבור נותק. מנסים להמשיך את השיחה.',

  finishedTitle: 'זו הייתה המזכירה החכמה שלנו.',
  finishedBody: 'היא עושה את זה על חשבוניות אמיתיות, בשיחות אמיתיות, כל יום — לפי הכללים שלכם.',
  signupCta: 'בקשו הדגמה',
  restart: 'דברו איתה שוב',

  rateLimitedVisitorTitle: 'כבר ניסיתם כמה פעמים',
  rateLimitedVisitorBody: 'המתינו כמה דקות לפני ניסיון נוסף.',
  rateLimitedCapacityTitle: 'כולם רוצים לדבר איתה',
  rateLimitedCapacityBody: 'הדמו החי בתפוסה מלאה כרגע. נסו שוב עוד קצת — או דלגו על התור ותנו לה לטפל בחשבוניות שלכם.',

  errorTitle: 'ההתחברות נכשלה',
  retry: 'נסו שוב',
  disconnect: 'סיום השיחה',
  timeRemaining: 'נותרו',


  supportIdLabel: 'מזהה תמיכה',
  supportCopy: 'העתקה',
  supportCopied: 'הועתק',

  consentHeading: 'לפני שמתחילים',
  consentAccept: 'אני מסכים — התחילו את השיחה',
  consentDecline: 'לא, תודה',
  consentPolicyLink: 'קראו את המדיניות המלאה',

  err_microphone_denied: 'המיקרופון חסום.',
  err_microphone_denied_hint: 'לחצו על סמל המנעול בשורת הכתובת, שנו את המיקרופון ל״אפשר״, ורעננו את הדף.',
  err_microphone_unavailable: 'לא הצלחנו לגשת למיקרופון. ודאו שאפליקציה אחרת לא משתמשת בו.',
  err_browser_unsupported: 'הדפדפן הזה לא תומך בדמו הקולי. נסו כרום, אדג׳ או ספארי.',
  err_network_error: 'לא הצלחנו להגיע לדמו. בדקו את החיבור ונסו שוב.',
  err_contract_violation: 'הדמו החזיר תשובה שלא הצלחנו לקרוא. הצוות שלנו עודכן.',
  err_agent_unavailable: 'המזכירה לא ענתה. נסו שוב.',
  err_agent_lost: 'המזכירה התנתקה מהשיחה. נסו שוב.',
  err_transport_failed: 'לא הצלחנו להצטרף לשיחה.',
  err_reconnect_failed: 'החיבור נותק ולא הצלחנו לשחזר אותו.',
  err_consent_declined: 'אין בעיה — הדמו לא התחיל.',
  err_session_expired_before_start: 'תוקף הדמו פג לפני שהתחיל. נסו שוב.',
  err_demo_disabled: 'הדמו החי כבוי כרגע.',
  err_demo_unavailable: 'הדמו אינו זמין זמנית.',
  err_demo_capacity_reached: 'הדמו בתפוסה מלאה כרגע.',
  err_rate_limited: 'יותר מדי ניסיונות. נסו שוב בקרוב.',
  err_verification_failed: 'לא הצלחנו לאמת את הדפדפן. רעננו את הדף ונסו שוב.',
  err_consent_required: 'הדמו זקוק להסכמתכם לפני שיוכל להתחיל.',
  err_invalid_request: 'תצורת הדמו שגויה — הצוות שלנו עודכן.',
  err_server_error: 'משהו השתבש אצלנו.',
  err_language_unavailable: '\u05dc\u05d0 \u05d4\u05e6\u05dc\u05d7\u05e0\u05d5 \u05dc\u05d1\u05d7\u05d5\u05e8 \u05d0\u05ea \u05e9\u05e4\u05ea \u05d4\u05e4\u05ea\u05d9\u05d7\u05d4. \u05e0\u05e1\u05d5 \u05e9\u05d5\u05d1.',
};

const ar: Strings = {
  heroEyebrow: 'جيس — مباشر',
  durationBadge: '~٢ د',
  startButton: 'تحدّث إلى وكيل التحصيل الذكي',
  sessionMeta: '~٢ د  ·  يلزم ميكروفون',

  unavailableTitle: 'العرض الصوتي غير متاح حاليًا',
  unavailableBody: 'سيعود قريبًا.',

  readyTitle: 'جرّب الوكيلة بنفسك',
  readyBody: 'مثّل دور العميل المتأخر.',
  startLabel: 'ابدأ العرض الصوتي',

  micTitle: 'اسمح باستخدام الميكروفون',
  micBody: 'يطلب المتصفح الإذن. لن يتمكن العرض من سماعك قبل الموافقة.',

  connectingTitle: 'جارٍ توصيلك بالسكرتيرة…',
  connectingBody: 'في انتظار أن تردّ.',

  listeningTitle: 'هي تستمع',
  listeningBody: 'تحدّث بشكل طبيعي — ستردّ عليك.',

  thinkingTitle: 'هي تفكّر',
  thinkingBody: 'تُعدّ ردّها الآن.',

  speakingTitle: 'هي تتحدث',
  speakingBody: 'يمكنك مقاطعتها في أي وقت.',

  reconnectingTitle: 'جارٍ إعادة الاتصال…',
  reconnectingBody: 'انقطع الاتصال. نحاول استئناف المكالمة.',

  finishedTitle: 'تلك كانت سكرتيرتنا الذكية.',
  finishedBody: 'تفعل ذلك مع فواتير حقيقية، في مكالمات حقيقية، كل يوم — وفق قواعدك.',
  signupCta: 'اطلب عرضًا توضيحيًا',
  restart: 'تحدّث إليها مرة أخرى',

  rateLimitedVisitorTitle: 'لقد جرّبت عدة مرات بالفعل',
  rateLimitedVisitorBody: 'انتظر بضع دقائق قبل تجربة العرض مجددًا.',
  rateLimitedCapacityTitle: 'الجميع يريد التحدث إليها',
  rateLimitedCapacityBody: 'العرض المباشر ممتلئ حاليًا. حاول لاحقًا — أو تجاوز الطابور ودعها تعمل على فواتيرك.',

  errorTitle: 'تعذّر الاتصال',
  retry: 'حاول مرة أخرى',
  disconnect: 'إنهاء المكالمة',
  timeRemaining: 'متبقٍ',


  supportIdLabel: 'معرّف الدعم',
  supportCopy: 'نسخ',
  supportCopied: 'تم النسخ',

  consentHeading: 'قبل أن نبدأ',
  consentAccept: 'أوافق — ابدأ المكالمة',
  consentDecline: 'لا، شكرًا',
  consentPolicyLink: 'اقرأ السياسة كاملة',

  err_microphone_denied: 'الميكروفون محظور.',
  err_microphone_denied_hint: 'اضغط على رمز القفل في شريط العنوان، واضبط الميكروفون على «السماح»، ثم أعد تحميل الصفحة.',
  err_microphone_unavailable: 'تعذّر الوصول إلى الميكروفون. تأكد من عدم استخدام تطبيق آخر له.',
  err_browser_unsupported: 'هذا المتصفح لا يدعم العرض الصوتي. جرّب Chrome أو Edge أو Safari.',
  err_network_error: 'تعذّر الوصول إلى العرض. تحقق من اتصالك وحاول مجددًا.',
  err_contract_violation: 'ردّ العرض بشيء تعذّر علينا قراءته. تم إبلاغ فريقنا.',
  err_agent_unavailable: 'لم تردّ السكرتيرة. حاول مرة أخرى.',
  err_agent_lost: 'انقطعت السكرتيرة عن المكالمة. حاول مرة أخرى.',
  err_transport_failed: 'تعذّر الانضمام إلى المكالمة.',
  err_reconnect_failed: 'فقدنا الاتصال ولم نتمكن من استعادته.',
  err_consent_declined: 'لا مشكلة — لم يبدأ العرض.',
  err_session_expired_before_start: 'انتهت صلاحية جلسة العرض قبل أن تبدأ. حاول مجددًا.',
  err_demo_disabled: 'العرض المباشر متوقف حاليًا.',
  err_demo_unavailable: 'العرض غير متاح مؤقتًا.',
  err_demo_capacity_reached: 'العرض ممتلئ حاليًا.',
  err_rate_limited: 'محاولات كثيرة جدًا. حاول مرة أخرى قريبًا.',
  err_verification_failed: 'تعذّر التحقق من متصفحك. أعد تحميل الصفحة وحاول مجددًا.',
  err_consent_required: 'يحتاج العرض إلى موافقتك قبل أن يبدأ.',
  err_invalid_request: 'إعدادات العرض غير صحيحة — تم إبلاغ فريقنا.',
  err_server_error: 'حدث خطأ لدينا.',
  err_language_unavailable: '\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062f \u0644\u063a\u0629 \u0627\u0644\u0628\u062f\u0627\u064a\u0629. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
};

const PACKS: Record<DemoLocale, Strings> = { en, he, ar };

export function stringsFor(locale: DemoLocale): Strings {
  return PACKS[locale];
}
