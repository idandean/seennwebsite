/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Built from tools/voice-demo/src by tools/voice-demo/scripts/build.mjs.
 * Edit the TypeScript source and re-run `npm run build` in tools/voice-demo.
 *
 * The public voice demo is enabled only by a window.SEENN_VOICE_DEMO block in
 * the page — see tools/voice-demo/CONFIGURATION.md. Nothing is baked in here.
 */
"use strict";
(() => {
  // src/contract.ts
  var KNOWN_ERROR_CODES = [
    "demo_disabled",
    "demo_unavailable",
    "demo_capacity_reached",
    "rate_limited",
    "verification_failed",
    "invalid_language",
    "consent_required",
    "consent_policy_outdated",
    "invalid_request",
    "server_error"
  ];
  var PREFERRED_RESPONSE_FIELDS = {
    token: "token",
    livekitUrl: "livekit_url",
    sessionId: "session_id",
    expiresAt: "expires_at",
    language: "language",
    recording: "recording"
  };
  var ALIASES = {
    token: ["token", "participant_token", "access_token", "accessToken", "participantToken"],
    livekitUrl: ["livekit_url", "livekitUrl", "url", "ws_url", "wsUrl", "server_url"],
    sessionId: ["session_id", "sessionId", "room_name", "roomName", "room", "preview_session_id"],
    expiresAt: ["expires_at", "expiresAt", "expiry", "expires"],
    language: ["language", "resolved_language", "resolvedLanguage", "locale"],
    recording: ["recording", "recording_consent", "recordingConsent", "consent"]
  };
  var RECORDING_ALIASES = {
    required: ["required", "consent_required", "consentRequired", "is_required"],
    text: ["text", "consent_text", "consentText", "notice", "message"],
    policyVersion: ["policy_version", "policyVersion", "version"],
    locale: ["locale", "language", "lang"],
    policyUrl: ["policy_url", "policyUrl", "url", "href"]
  };
  var ContractViolation = class extends Error {
    constructor(problems) {
      super(
        `public-voice-demo response is unusable: ${problems.join("; ")}. See tools/voice-demo/BACKEND-CONTRACT.md.`
      );
      this.name = "ContractViolation";
      this.problems = problems;
    }
  };
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function pickString(source, keys) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim().length > 0) return value;
    }
    return void 0;
  }
  function pickBoolean(source, keys) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "boolean") return value;
    }
    return void 0;
  }
  function pickRecord(source, keys) {
    for (const key of keys) {
      const value = source[key];
      if (isRecord(value)) return value;
    }
    return void 0;
  }
  function canonicalizeLanguage(raw) {
    var _a;
    if (!raw) return null;
    const tag = raw.trim().toLowerCase().replace(/_/g, "-");
    const primary = (_a = tag.split("-")[0]) != null ? _a : "";
    if (primary === "en") return "en";
    if (primary === "he" || primary === "iw") return "he";
    if (primary === "ar") return "ar";
    return null;
  }
  function isSecureWebSocketUrl(raw) {
    try {
      return new URL(raw).protocol === "wss:";
    } catch {
      return false;
    }
  }
  function isHttpUrl(raw) {
    try {
      const protocol = new URL(raw).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }
  function parseRecording(raw) {
    var _a;
    if (!isRecord(raw)) return { status: "absent" };
    const required = (_a = pickBoolean(raw, RECORDING_ALIASES.required)) != null ? _a : false;
    const text = pickString(raw, RECORDING_ALIASES.text);
    const policyVersion = pickString(raw, RECORDING_ALIASES.policyVersion);
    const locale = pickString(raw, RECORDING_ALIASES.locale);
    const policyUrl = pickString(raw, RECORDING_ALIASES.policyUrl);
    if (!text && !policyVersion && !required) return { status: "absent" };
    if (!text) {
      return { status: "malformed", required, reason: "recording block has no consent text" };
    }
    if (!policyVersion) {
      return { status: "malformed", required, reason: "recording block has no policy version" };
    }
    if (policyUrl !== void 0 && !isHttpUrl(policyUrl)) {
      return { status: "malformed", required, reason: "recording policy_url is not http(s)" };
    }
    const consent = {
      required,
      text,
      policyVersion,
      locale: locale != null ? locale : ""
    };
    if (policyUrl !== void 0) consent.policyUrl = policyUrl;
    return { status: "ok", consent };
  }
  function readErrorCode(body, httpStatus) {
    var _a;
    const raw = isRecord(body) ? pickString(body, ["error", "code", "error_code", "errorCode", "type"]) : void 0;
    if (raw) {
      const normalized = (_a = raw.split("/").pop()) != null ? _a : raw;
      if (KNOWN_ERROR_CODES.includes(normalized)) return normalized;
    }
    if (httpStatus === 429) return "rate_limited";
    if (httpStatus === 503) return "demo_unavailable";
    if (httpStatus === 403) return "verification_failed";
    if (httpStatus >= 400 && httpStatus < 500) return "invalid_request";
    return "server_error";
  }
  function normalizeSession(raw, options = {}) {
    var _a;
    if (!isRecord(raw)) throw new ContractViolation(["response body was not an object"]);
    const now = (_a = options.now) != null ? _a : Date.now();
    const problems = [];
    const token = pickString(raw, ALIASES.token);
    const livekitUrl = pickString(raw, ALIASES.livekitUrl);
    const sessionId = pickString(raw, ALIASES.sessionId);
    const expiresAt = pickString(raw, ALIASES.expiresAt);
    const language = pickString(raw, ALIASES.language);
    if (!token) problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.token}`);
    if (!livekitUrl) {
      problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.livekitUrl}`);
    } else if (!isSecureWebSocketUrl(livekitUrl)) {
      problems.push(`${PREFERRED_RESPONSE_FIELDS.livekitUrl} must be a wss:// URL`);
    }
    if (!sessionId) problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.sessionId}`);
    if (!expiresAt) {
      problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.expiresAt}`);
    } else {
      const parsed = Date.parse(expiresAt);
      if (Number.isNaN(parsed)) {
        problems.push(`${PREFERRED_RESPONSE_FIELDS.expiresAt} is not a valid ISO-8601 timestamp`);
      } else if (parsed <= now) {
        problems.push(`${PREFERRED_RESPONSE_FIELDS.expiresAt} is already in the past`);
      }
    }
    const canonicalLanguage = canonicalizeLanguage(language);
    if (!language) {
      problems.push(`missing ${PREFERRED_RESPONSE_FIELDS.language}`);
    } else if (!canonicalLanguage) {
      problems.push(`${PREFERRED_RESPONSE_FIELDS.language} "${language}" is not one of en, he, ar`);
    }
    if (canonicalLanguage && options.expectedLanguage && canonicalLanguage !== options.expectedLanguage) {
      problems.push(
        `response language does not match requested language`
      );
    }
    const recording = parseRecording(pickRecord(raw, ALIASES.recording));
    if (recording.status === "malformed" && recording.required) {
      problems.push(recording.reason);
    }
    if (token && recording.status === "ok" && recording.consent.required) {
      problems.push("response carries a usable token together with recording.required=true");
    }
    if (token && recording.status === "malformed" && recording.required) {
      problems.push("response carries a usable token together with a required recording block");
    }
    if (problems.length > 0) throw new ContractViolation(problems);
    const session = {
      token,
      livekitUrl,
      sessionId,
      expiresAt,
      language: canonicalLanguage
    };
    if (recording.status === "ok") session.recording = recording.consent;
    return session;
  }
  function looksLikeServerSecret(value) {
    if (!value) return false;
    const parts = value.split(".");
    if (parts.length === 3 && parts[1]) {
      try {
        const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        if (/"role"\s*:\s*"service_role"/.test(atob(payload))) return true;
      } catch {
      }
    }
    return /^sb_secret_/i.test(value.trim()) || /service_role|SUPABASE_SERVICE|SERVICE_ROLE_KEY/i.test(value) || /LIVEKIT_API_SECRET|LIVEKIT_SECRET/i.test(value) || /\bsk_live_|\bsk_test_|secret_key/i.test(value);
  }

  // src/consent.ts
  var CONSENT_POLICY_VERSION = "2026-08-03.4";
  var CONSENT_STRINGS = {
    en: {
      disclosure: "This demo is recorded and transcribed, then automatically deleted after 7 days",
      detailsLabel: "Details",
      dialogTitle: "Before we begin",
      privacyLabel: "Privacy policy",
      goBackLabel: "Go back",
      agreeLabel: "Agree and start"
    },
    he: {
      disclosure: "\u05D4\u05D4\u05D3\u05D2\u05DE\u05D4 \u05DE\u05D5\u05E7\u05DC\u05D8\u05EA \u05D5\u05DE\u05EA\u05D5\u05DE\u05DC\u05DC\u05EA \u05D5\u05E0\u05DE\u05D7\u05E7\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05DC\u05D0\u05D7\u05E8 7 \u05D9\u05DE\u05D9\u05DD",
      detailsLabel: "\u05E4\u05E8\u05D8\u05D9\u05DD",
      dialogTitle: "\u05DC\u05E4\u05E0\u05D9 \u05E9\u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD",
      privacyLabel: "\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA",
      goBackLabel: "\u05D7\u05D6\u05E8\u05D4",
      agreeLabel: "\u05D4\u05E1\u05DB\u05DE\u05D4 \u05D5\u05D4\u05EA\u05D7\u05DC\u05D4"
    },
    ar: {
      disclosure: "\u064A\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A \u0648\u062A\u0641\u0631\u064A\u063A\u0647 \u0646\u0635\u064A\u064B\u0627\u060C \u0648\u064A\u064F\u062D\u0630\u0641 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0628\u0639\u062F 7 \u0623\u064A\u0627\u0645",
      detailsLabel: "\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644",
      dialogTitle: "\u0642\u0628\u0644 \u0623\u0646 \u0646\u0628\u062F\u0623",
      privacyLabel: "\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629",
      goBackLabel: "\u0631\u062C\u0648\u0639",
      agreeLabel: "\u0623\u0648\u0627\u0641\u0642 \u0648\u0623\u0628\u062F\u0623"
    }
  };
  var PRIVACY_POLICY_URLS = {
    en: "/privacy-policy.html",
    he: "/he/privacy-policy.html",
    ar: "/privacy-policy.html"
  };
  function consentStringsFor(locale) {
    var _a;
    return (_a = CONSENT_STRINGS[locale]) != null ? _a : CONSENT_STRINGS.en;
  }
  function isLocale(value) {
    return value === "en" || value === "he" || value === "ar";
  }
  function readCatalogEntry(payload, requested, expectedVersion) {
    if (typeof payload !== "object" || payload === null) {
      return { status: "failed", reason: "catalog response was not an object" };
    }
    const row = payload;
    const text = row["text"];
    const version = row["policy_version"];
    const locale = row["locale"];
    if (typeof text !== "string" || text.trim() === "") {
      return { status: "failed", reason: "catalog entry has no consent text" };
    }
    if (typeof version !== "string" || version.trim() === "") {
      return { status: "failed", reason: "catalog entry has no policy version" };
    }
    if (version !== expectedVersion) {
      return {
        status: "failed",
        reason: `catalog served policy ${version}, this build renders ${expectedVersion}`
      };
    }
    if (!isLocale(locale) || locale !== requested) {
      return { status: "failed", reason: "catalog entry locale does not match the requested locale" };
    }
    return { status: "ok", entry: { policyVersion: version, locale, text } };
  }
  async function fetchConsentCatalog(options) {
    var _a, _b, _c;
    const expectedVersion = (_a = options.expectedVersion) != null ? _a : CONSENT_POLICY_VERSION;
    const doFetch = (_b = options.fetchImpl) != null ? _b : globalThis.fetch.bind(globalThis);
    const timeoutMs = (_c = options.timeoutMs) != null ? _c : 4e3;
    if (!options.url || !options.anonKey) {
      return { status: "failed", reason: "consent catalog is not configured" };
    }
    let url;
    try {
      const parsed = new URL(options.url);
      parsed.searchParams.set("locale", options.locale);
      parsed.searchParams.set("policy_version", expectedVersion);
      url = parsed.toString();
    } catch {
      return { status: "failed", reason: "consent catalog URL is not a valid URL" };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      const response = await doFetch(url, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        headers: { apikey: options.anonKey },
        signal: controller.signal
      });
      if (!response.ok) {
        return { status: "failed", reason: `catalog request failed with ${response.status}` };
      }
      const payload = await response.json();
      return readCatalogEntry(payload, options.locale, expectedVersion);
    } catch {
      return { status: "failed", reason: "catalog request could not be completed" };
    } finally {
      clearTimeout(timer);
    }
  }
  function resolveConsentMode(raw) {
    return raw === "required" ? "required" : "disabled";
  }
  var ConsentGate = class {
    constructor(mode, policyVersion = CONSENT_POLICY_VERSION) {
      this.mode = mode;
      this.policyVersion = policyVersion;
      this.entry = null;
      this.receipt = null;
    }
    get required() {
      return this.mode === "required";
    }
    /** The catalog row currently on screen, if the dialog is showing one. */
    get pending() {
      return this.entry;
    }
    /** Arms the gate with a validated catalog row. Clears any prior acceptance. */
    present(entry) {
      this.entry = entry;
      this.receipt = null;
    }
    get approved() {
      if (!this.required) return true;
      const held = this.receipt;
      return held !== null && held.policyVersion === this.policyVersion;
    }
    /**
     * Records the affirmative act against the row that was actually shown.
     * Idempotent, so a double click cannot yield two acceptances.
     */
    approve(now = /* @__PURE__ */ new Date()) {
      if (this.receipt) return this.receipt;
      const shown = this.entry;
      if (!shown || shown.policyVersion !== this.policyVersion) return null;
      this.receipt = {
        policyVersion: shown.policyVersion,
        locale: shown.locale,
        acceptedAt: now.toISOString()
      };
      return this.receipt;
    }
    /** Consumes the acceptance. The next session needs a fresh one. */
    take() {
      const held = this.receipt;
      this.receipt = null;
      this.entry = null;
      return held;
    }
    /** Drops everything — used when the dialog is dismissed. */
    revoke() {
      this.receipt = null;
      this.entry = null;
    }
  };

  // src/logging.ts
  var TOKEN_LIKE = [
    // JWTs — the participant token and the anon key are both this shape.
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g,
    // Anything after a token-ish key in a serialised object.
    /("?(?:token|apikey|api_key|authorization|access_token|participant_token|key)"?\s*[:=]\s*"?)([^",\s}]+)/gi
  ];
  var REDACTED = "[redacted]";
  function redact(value) {
    if (typeof value === "string") return redactString(value);
    if (value instanceof Error) return `${value.name}: ${redactString(value.message)}`;
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object") {
      const out = {};
      for (const [key, inner] of Object.entries(value)) {
        out[key] = /token|apikey|api_key|authorization|key|secret/i.test(key) ? REDACTED : redact(inner);
      }
      return out;
    }
    return value;
  }
  function redactString(input) {
    let out = input;
    out = out.replace(TOKEN_LIKE[0], REDACTED);
    out = out.replace(TOKEN_LIKE[1], (_m, prefix) => `${prefix}${REDACTED}`);
    return out;
  }
  function safeUrl(raw) {
    try {
      const url = new URL(raw);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return "[unparseable url]";
    }
  }
  var logger = {
    warn(message, detail) {
      if (detail === void 0) console.warn(`[voice-demo] ${message}`);
      else console.warn(`[voice-demo] ${message}`, redact(detail));
    },
    error(message, detail) {
      if (detail === void 0) console.error(`[voice-demo] ${message}`);
      else console.error(`[voice-demo] ${message}`, redact(detail));
    }
  };

  // src/config.ts
  var LIVEKIT_CLIENT_VERSION = "2.21.0";
  var LIVEKIT_MODULE_URL = `https://cdn.jsdelivr.net/npm/livekit-client@${LIVEKIT_CLIENT_VERSION}/+esm`;
  var DEFAULT_CONFIG = {
    publicDemoMode: "disabled",
    recordingConsentMode: "disabled",
    consentCatalogPath: "/functions/v1/public-voice-demo-consent",
    consentCatalogTimeoutMs: 4e3,
    endpointBaseUrl: "",
    anonKey: "",
    endpointPath: "/functions/v1/public-voice-demo",
    turnstileSiteKey: "",
    locale: null,
    languageOverride: null,
    coreSrc: "/images/orb-core.mp4",
    livekitModuleUrl: LIVEKIT_MODULE_URL,
    languageLookupUrl: "/api/voice-demo-language",
    languageLookupTimeoutMs: 1500,
    maxSessionSeconds: 120,
    reconnectTimeoutSeconds: 20,
    agentReadinessTimeoutSeconds: 20,
    signupUrl: "https://app.seenn.ai/auth/signup",
    orbSize: 200,
    renderWhenUnavailable: false,
    showSupportId: false
  };
  function metaContent(name) {
    var _a, _b;
    return (_b = (_a = document.querySelector(`meta[name="${name}"]`)) == null ? void 0 : _a.getAttribute("content")) != null ? _b : void 0;
  }
  function isSafeLanguageLookupUrl(value) {
    if (typeof value !== "string" || value.length === 0) return false;
    try {
      const parsed = new URL(value, window.location.href);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.origin === window.location.origin && parsed.username === "" && parsed.password === "";
    } catch {
      return false;
    }
  }
  function urlParameter() {
    var _a;
    try {
      return (_a = new URLSearchParams(window.location.search).get("voicedemo")) != null ? _a : void 0;
    } catch {
      return void 0;
    }
  }
  function isKillSignal(raw) {
    if (raw === void 0) return false;
    const value = raw.trim().toLowerCase();
    return value === "disabled" || value === "off" || value === "false" || value === "0";
  }
  function isEnableSignal(raw) {
    return raw === "enabled";
  }
  function resolveConfig(sources = {}) {
    var _a;
    const inline = (_a = sources.inline) != null ? _a : window.SEENN_VOICE_DEMO;
    const config = { ...DEFAULT_CONFIG, ...inline != null ? inline : {} };
    let mode = isEnableSignal(inline == null ? void 0 : inline.publicDemoMode) ? "enabled" : "disabled";
    if (isKillSignal(urlParameter())) mode = "disabled";
    if (isKillSignal(metaContent("seenn:public-demo-mode"))) mode = "disabled";
    config.publicDemoMode = mode;
    config.recordingConsentMode = resolveConsentMode(inline == null ? void 0 : inline.recordingConsentMode);
    const dataset = sources.dataset;
    if (dataset) {
      if (dataset["orbSize"]) config.orbSize = Number(dataset["orbSize"]) || config.orbSize;
      if (dataset["locale"]) config.locale = dataset["locale"];
    }
    if (config.anonKey && looksLikeServerSecret(config.anonKey)) {
      logger.error(
        "refusing to start: the configured key looks like a server-side secret (service_role / sb_secret_ / API secret). Use the Supabase anon or publishable key."
      );
      config.anonKey = "";
      config.publicDemoMode = "disabled";
    }
    if (config.languageLookupUrl !== "" && !isSafeLanguageLookupUrl(config.languageLookupUrl)) {
      logger.error(
        "refusing to start: the language lookup URL must be an HTTP(S) URL on this page origin"
      );
      config.languageLookupUrl = "";
      config.publicDemoMode = "disabled";
    }
    return config;
  }
  function unavailableReason(config) {
    var _a;
    if (config.publicDemoMode !== "enabled") return "flag_disabled";
    if (!config.endpointBaseUrl || !config.anonKey) return "endpoint_not_configured";
    if (!config.turnstileSiteKey) return "turnstile_not_configured";
    if (typeof navigator === "undefined" || !((_a = navigator.mediaDevices) == null ? void 0 : _a.getUserMedia)) {
      return "browser_unsupported";
    }
    return null;
  }

  // src/i18n.ts
  var RTL_LOCALES = ["he", "ar"];
  function directionFor(locale) {
    return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  }
  function resolveLocale(configured, documentLang) {
    if (configured && isSupported(configured)) return configured;
    const lang = (documentLang != null ? documentLang : "").toLowerCase();
    if (lang.startsWith("he") || lang.startsWith("iw")) return "he";
    if (lang.startsWith("ar")) return "ar";
    return "en";
  }
  function isSupported(value) {
    return value === "en" || value === "he" || value === "ar";
  }
  var en = {
    heroEyebrow: "Talk to Jess \u2014 live",
    durationBadge: "~2 min",
    startButton: "Talk to the AI Collection Agent",
    sessionMeta: "~2 min  \xB7  Microphone required",
    unavailableTitle: "The voice demo is not available right now",
    unavailableBody: "It will be back shortly.",
    readyTitle: "Try the agent yourself",
    readyBody: "Play the overdue customer.",
    startLabel: "Start the voice demo",
    micTitle: "Allow your microphone",
    micBody: "Your browser is asking for permission. The demo cannot hear you until you allow it.",
    connectingTitle: "Connecting you to the secretary\u2026",
    connectingBody: "Waiting for her to pick up.",
    listeningTitle: "She is listening",
    listeningBody: "Talk normally \u2014 she will answer you.",
    thinkingTitle: "She is thinking",
    thinkingBody: "Working out what to say next.",
    speakingTitle: "She is speaking",
    speakingBody: "Interrupt her whenever you like.",
    reconnectingTitle: "Reconnecting\u2026",
    reconnectingBody: "The connection dropped. Trying to pick the call back up.",
    finishedTitle: "That was our AI secretary.",
    finishedBody: "She does this for real invoices, on real phone calls, every day \u2014 following your rules.",
    signupCta: "Request a Demo",
    restart: "Talk to her again",
    rateLimitedVisitorTitle: "You have had a few goes already",
    rateLimitedVisitorBody: "Give it a few minutes before trying the demo again.",
    rateLimitedCapacityTitle: "Everyone wants a word with her",
    rateLimitedCapacityBody: "The live demo is at capacity right now. Try again a little later \u2014 or skip the queue and put her to work on your own invoices.",
    errorTitle: "That didn\u2019t connect",
    retry: "Try again",
    disconnect: "End the call",
    timeRemaining: "left",
    supportIdLabel: "Support ID",
    supportCopy: "Copy",
    supportCopied: "Copied",
    consentHeading: "Before we begin",
    consentAccept: "I agree \u2014 start the call",
    consentDecline: "No thanks",
    consentPolicyLink: "Read the full policy",
    err_microphone_denied: "Microphone blocked.",
    err_microphone_denied_hint: "Click the padlock in your browser\u2019s address bar, set Microphone to \u201CAllow\u201D, then reload this page.",
    err_microphone_unavailable: "We couldn\u2019t reach your microphone. Check that no other app is using it.",
    err_browser_unsupported: "This browser can\u2019t run the voice demo. Try Chrome, Edge or Safari.",
    err_network_error: "We couldn\u2019t reach the demo. Check your connection and try again.",
    err_contract_violation: "The demo replied with something we couldn\u2019t use. Our team has been notified.",
    err_consent_policy_outdated: "The consent notice has been updated. Please read it again and press the button to continue.",
    err_capture_unavailable: "We could not start the recording for this demo, so we stopped before your microphone was used. Please try again.",
    err_agent_unavailable: "The secretary didn\u2019t pick up. Please try again.",
    err_agent_lost: "The secretary dropped off the call. Please try again.",
    err_transport_failed: "We couldn\u2019t join the call.",
    err_reconnect_failed: "We lost the connection and couldn\u2019t get it back.",
    err_consent_declined: "No problem \u2014 the demo did not start.",
    err_session_expired_before_start: "That demo session expired before it started. Try again.",
    err_demo_disabled: "The live demo is switched off at the moment.",
    err_demo_unavailable: "The demo is temporarily unavailable.",
    err_demo_capacity_reached: "The demo is at capacity right now.",
    err_rate_limited: "Too many attempts. Try again shortly.",
    err_verification_failed: "We couldn\u2019t verify your browser. Reload the page and try again.",
    err_consent_required: "The demo needs your agreement before it can start.",
    err_invalid_request: "The demo is misconfigured \u2014 our team has been notified.",
    err_server_error: "Something went wrong on our side.",
    err_language_unavailable: "We could not choose the opening language. Please try again."
  };
  var he = {
    heroEyebrow: "\u05D2\u05F3\u05E1 \u2014 \u05D1\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9",
    durationBadge: "~2 \u05D3\u05E7\u05F3",
    startButton: "\u05D3\u05D1\u05E8\u05D5 \u05E2\u05DD \u05E1\u05D5\u05DB\u05DF \u05D4\u05D2\u05D1\u05D9\u05D9\u05D4 \u05D4\u05D7\u05DB\u05DD",
    sessionMeta: "~2 \u05D3\u05E7\u05F3  \xB7  \u05E0\u05D3\u05E8\u05E9 \u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF",
    unavailableTitle: "\u05D4\u05D3\u05DE\u05D5 \u05D4\u05E7\u05D5\u05DC\u05D9 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05DB\u05E8\u05D2\u05E2",
    unavailableBody: "\u05D4\u05D5\u05D0 \u05D9\u05D7\u05D6\u05D5\u05E8 \u05D1\u05E7\u05E8\u05D5\u05D1.",
    readyTitle: "\u05E0\u05E1\u05D5 \u05D0\u05EA \u05D4\u05E1\u05D5\u05DB\u05E0\u05EA \u05D1\u05E2\u05E6\u05DE\u05DB\u05DD",
    readyBody: "\u05E9\u05D7\u05E7\u05D5 \u05D0\u05EA \u05D4\u05DC\u05E7\u05D5\u05D7 \u05E9\u05D1\u05D0\u05D9\u05D7\u05D5\u05E8.",
    startLabel: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05D0\u05EA \u05D4\u05D3\u05DE\u05D5 \u05D4\u05E7\u05D5\u05DC\u05D9",
    micTitle: "\u05D0\u05E9\u05E8\u05D5 \u05D2\u05D9\u05E9\u05D4 \u05DC\u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF",
    micBody: "\u05D4\u05D3\u05E4\u05D3\u05E4\u05DF \u05DE\u05D1\u05E7\u05E9 \u05D4\u05E8\u05E9\u05D0\u05D4. \u05D1\u05DC\u05D9 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D3\u05DE\u05D5 \u05DC\u05D0 \u05D9\u05D5\u05DB\u05DC \u05DC\u05E9\u05DE\u05D5\u05E2 \u05D0\u05EA\u05DB\u05DD.",
    connectingTitle: "\u05DE\u05D7\u05D1\u05E8\u05D9\u05DD \u05D0\u05EA\u05DB\u05DD \u05DC\u05DE\u05D6\u05DB\u05D9\u05E8\u05D4\u2026",
    connectingBody: "\u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD \u05E9\u05D4\u05D9\u05D0 \u05EA\u05E2\u05E0\u05D4.",
    listeningTitle: "\u05D4\u05D9\u05D0 \u05DE\u05E7\u05E9\u05D9\u05D1\u05D4",
    listeningBody: "\u05D3\u05D1\u05E8\u05D5 \u05E8\u05D2\u05D9\u05DC \u2014 \u05D4\u05D9\u05D0 \u05EA\u05E2\u05E0\u05D4 \u05DC\u05DB\u05DD.",
    thinkingTitle: "\u05D4\u05D9\u05D0 \u05D7\u05D5\u05E9\u05D1\u05EA",
    thinkingBody: "\u05DE\u05E0\u05E1\u05D7\u05EA \u05D0\u05EA \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4.",
    speakingTitle: "\u05D4\u05D9\u05D0 \u05DE\u05D3\u05D1\u05E8\u05EA",
    speakingBody: "\u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05E4\u05E8\u05D9\u05E2 \u05DC\u05D4 \u05D1\u05DB\u05DC \u05E8\u05D2\u05E2.",
    reconnectingTitle: "\u05DE\u05EA\u05D7\u05D1\u05E8\u05D9\u05DD \u05DE\u05D7\u05D3\u05E9\u2026",
    reconnectingBody: "\u05D4\u05D7\u05D9\u05D1\u05D5\u05E8 \u05E0\u05D5\u05EA\u05E7. \u05DE\u05E0\u05E1\u05D9\u05DD \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05D0\u05EA \u05D4\u05E9\u05D9\u05D7\u05D4.",
    finishedTitle: "\u05D6\u05D5 \u05D4\u05D9\u05D9\u05EA\u05D4 \u05D4\u05DE\u05D6\u05DB\u05D9\u05E8\u05D4 \u05D4\u05D7\u05DB\u05DE\u05D4 \u05E9\u05DC\u05E0\u05D5.",
    finishedBody: "\u05D4\u05D9\u05D0 \u05E2\u05D5\u05E9\u05D4 \u05D0\u05EA \u05D6\u05D4 \u05E2\u05DC \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05D0\u05DE\u05D9\u05EA\u05D9\u05D5\u05EA, \u05D1\u05E9\u05D9\u05D7\u05D5\u05EA \u05D0\u05DE\u05D9\u05EA\u05D9\u05D5\u05EA, \u05DB\u05DC \u05D9\u05D5\u05DD \u2014 \u05DC\u05E4\u05D9 \u05D4\u05DB\u05DC\u05DC\u05D9\u05DD \u05E9\u05DC\u05DB\u05DD.",
    signupCta: "\u05D1\u05E7\u05E9\u05D5 \u05D4\u05D3\u05D2\u05DE\u05D4",
    restart: "\u05D3\u05D1\u05E8\u05D5 \u05D0\u05D9\u05EA\u05D4 \u05E9\u05D5\u05D1",
    rateLimitedVisitorTitle: "\u05DB\u05D1\u05E8 \u05E0\u05D9\u05E1\u05D9\u05EA\u05DD \u05DB\u05DE\u05D4 \u05E4\u05E2\u05DE\u05D9\u05DD",
    rateLimitedVisitorBody: "\u05D4\u05DE\u05EA\u05D9\u05E0\u05D5 \u05DB\u05DE\u05D4 \u05D3\u05E7\u05D5\u05EA \u05DC\u05E4\u05E0\u05D9 \u05E0\u05D9\u05E1\u05D9\u05D5\u05DF \u05E0\u05D5\u05E1\u05E3.",
    rateLimitedCapacityTitle: "\u05DB\u05D5\u05DC\u05DD \u05E8\u05D5\u05E6\u05D9\u05DD \u05DC\u05D3\u05D1\u05E8 \u05D0\u05D9\u05EA\u05D4",
    rateLimitedCapacityBody: "\u05D4\u05D3\u05DE\u05D5 \u05D4\u05D7\u05D9 \u05D1\u05EA\u05E4\u05D5\u05E1\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05DB\u05E8\u05D2\u05E2. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05E2\u05D5\u05D3 \u05E7\u05E6\u05EA \u2014 \u05D0\u05D5 \u05D3\u05DC\u05D2\u05D5 \u05E2\u05DC \u05D4\u05EA\u05D5\u05E8 \u05D5\u05EA\u05E0\u05D5 \u05DC\u05D4 \u05DC\u05D8\u05E4\u05DC \u05D1\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD.",
    errorTitle: "\u05D4\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05E0\u05DB\u05E9\u05DC\u05D4",
    retry: "\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1",
    disconnect: "\u05E1\u05D9\u05D5\u05DD \u05D4\u05E9\u05D9\u05D7\u05D4",
    timeRemaining: "\u05E0\u05D5\u05EA\u05E8\u05D5",
    supportIdLabel: "\u05DE\u05D6\u05D4\u05D4 \u05EA\u05DE\u05D9\u05DB\u05D4",
    supportCopy: "\u05D4\u05E2\u05EA\u05E7\u05D4",
    supportCopied: "\u05D4\u05D5\u05E2\u05EA\u05E7",
    consentHeading: "\u05DC\u05E4\u05E0\u05D9 \u05E9\u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD",
    consentAccept: "\u05D0\u05E0\u05D9 \u05DE\u05E1\u05DB\u05D9\u05DD \u2014 \u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05D0\u05EA \u05D4\u05E9\u05D9\u05D7\u05D4",
    consentDecline: "\u05DC\u05D0, \u05EA\u05D5\u05D3\u05D4",
    consentPolicyLink: "\u05E7\u05E8\u05D0\u05D5 \u05D0\u05EA \u05D4\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05DE\u05DC\u05D0\u05D4",
    err_microphone_denied: "\u05D4\u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF \u05D7\u05E1\u05D5\u05DD.",
    err_microphone_denied_hint: "\u05DC\u05D7\u05E6\u05D5 \u05E2\u05DC \u05E1\u05DE\u05DC \u05D4\u05DE\u05E0\u05E2\u05D5\u05DC \u05D1\u05E9\u05D5\u05E8\u05EA \u05D4\u05DB\u05EA\u05D5\u05D1\u05EA, \u05E9\u05E0\u05D5 \u05D0\u05EA \u05D4\u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF \u05DC\u05F4\u05D0\u05E4\u05E9\u05E8\u05F4, \u05D5\u05E8\u05E2\u05E0\u05E0\u05D5 \u05D0\u05EA \u05D4\u05D3\u05E3.",
    err_microphone_unavailable: "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D2\u05E9\u05EA \u05DC\u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF. \u05D5\u05D3\u05D0\u05D5 \u05E9\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D0\u05D7\u05E8\u05EA \u05DC\u05D0 \u05DE\u05E9\u05EA\u05DE\u05E9\u05EA \u05D1\u05D5.",
    err_browser_unsupported: "\u05D4\u05D3\u05E4\u05D3\u05E4\u05DF \u05D4\u05D6\u05D4 \u05DC\u05D0 \u05EA\u05D5\u05DE\u05DA \u05D1\u05D3\u05DE\u05D5 \u05D4\u05E7\u05D5\u05DC\u05D9. \u05E0\u05E1\u05D5 \u05DB\u05E8\u05D5\u05DD, \u05D0\u05D3\u05D2\u05F3 \u05D0\u05D5 \u05E1\u05E4\u05D0\u05E8\u05D9.",
    err_network_error: "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D4\u05D2\u05D9\u05E2 \u05DC\u05D3\u05DE\u05D5. \u05D1\u05D3\u05E7\u05D5 \u05D0\u05EA \u05D4\u05D7\u05D9\u05D1\u05D5\u05E8 \u05D5\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    err_contract_violation: "\u05D4\u05D3\u05DE\u05D5 \u05D4\u05D7\u05D6\u05D9\u05E8 \u05EA\u05E9\u05D5\u05D1\u05D4 \u05E9\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05E7\u05E8\u05D5\u05D0. \u05D4\u05E6\u05D5\u05D5\u05EA \u05E9\u05DC\u05E0\u05D5 \u05E2\u05D5\u05D3\u05DB\u05DF.",
    err_consent_policy_outdated: "\u05D4\u05D5\u05D3\u05E2\u05EA \u05D4\u05D4\u05E1\u05DB\u05DE\u05D4 \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4. \u05E7\u05E8\u05D0\u05D5 \u05D0\u05D5\u05EA\u05D4 \u05E9\u05D5\u05D1 \u05D5\u05DC\u05D7\u05E6\u05D5 \u05E2\u05DC \u05D4\u05DB\u05E4\u05EA\u05D5\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA.",
    err_capture_unavailable: "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D0\u05EA \u05D4\u05D4\u05E7\u05DC\u05D8\u05D4 \u05DC\u05D4\u05D3\u05D2\u05DE\u05D4, \u05D5\u05DC\u05DB\u05DF \u05E2\u05E6\u05E8\u05E0\u05D5 \u05E2\u05D5\u05D3 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05E0\u05E2\u05E9\u05D4 \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    err_agent_unavailable: "\u05D4\u05DE\u05D6\u05DB\u05D9\u05E8\u05D4 \u05DC\u05D0 \u05E2\u05E0\u05EA\u05D4. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    err_agent_lost: "\u05D4\u05DE\u05D6\u05DB\u05D9\u05E8\u05D4 \u05D4\u05EA\u05E0\u05EA\u05E7\u05D4 \u05DE\u05D4\u05E9\u05D9\u05D7\u05D4. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    err_transport_failed: "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D4\u05E6\u05D8\u05E8\u05E3 \u05DC\u05E9\u05D9\u05D7\u05D4.",
    err_reconnect_failed: "\u05D4\u05D7\u05D9\u05D1\u05D5\u05E8 \u05E0\u05D5\u05EA\u05E7 \u05D5\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05E9\u05D7\u05D6\u05E8 \u05D0\u05D5\u05EA\u05D5.",
    err_consent_declined: "\u05D0\u05D9\u05DF \u05D1\u05E2\u05D9\u05D4 \u2014 \u05D4\u05D3\u05DE\u05D5 \u05DC\u05D0 \u05D4\u05EA\u05D7\u05D9\u05DC.",
    err_session_expired_before_start: "\u05EA\u05D5\u05E7\u05E3 \u05D4\u05D3\u05DE\u05D5 \u05E4\u05D2 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D4\u05EA\u05D7\u05D9\u05DC. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    err_demo_disabled: "\u05D4\u05D3\u05DE\u05D5 \u05D4\u05D7\u05D9 \u05DB\u05D1\u05D5\u05D9 \u05DB\u05E8\u05D2\u05E2.",
    err_demo_unavailable: "\u05D4\u05D3\u05DE\u05D5 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05D6\u05DE\u05E0\u05D9\u05EA.",
    err_demo_capacity_reached: "\u05D4\u05D3\u05DE\u05D5 \u05D1\u05EA\u05E4\u05D5\u05E1\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05DB\u05E8\u05D2\u05E2.",
    err_rate_limited: "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05E0\u05D9\u05E1\u05D9\u05D5\u05E0\u05D5\u05EA. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E7\u05E8\u05D5\u05D1.",
    err_verification_failed: "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D0\u05DE\u05EA \u05D0\u05EA \u05D4\u05D3\u05E4\u05D3\u05E4\u05DF. \u05E8\u05E2\u05E0\u05E0\u05D5 \u05D0\u05EA \u05D4\u05D3\u05E3 \u05D5\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    err_consent_required: "\u05D4\u05D3\u05DE\u05D5 \u05D6\u05E7\u05D5\u05E7 \u05DC\u05D4\u05E1\u05DB\u05DE\u05EA\u05DB\u05DD \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D9\u05D5\u05DB\u05DC \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC.",
    err_invalid_request: "\u05EA\u05E6\u05D5\u05E8\u05EA \u05D4\u05D3\u05DE\u05D5 \u05E9\u05D2\u05D5\u05D9\u05D4 \u2014 \u05D4\u05E6\u05D5\u05D5\u05EA \u05E9\u05DC\u05E0\u05D5 \u05E2\u05D5\u05D3\u05DB\u05DF.",
    err_server_error: "\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9 \u05D0\u05E6\u05DC\u05E0\u05D5.",
    err_language_unavailable: "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05D0\u05EA \u05E9\u05E4\u05EA \u05D4\u05E4\u05EA\u05D9\u05D7\u05D4. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1."
  };
  var ar = {
    heroEyebrow: "\u062C\u064A\u0633 \u2014 \u0645\u0628\u0627\u0634\u0631",
    durationBadge: "~\u0662 \u062F",
    startButton: "\u062A\u062D\u062F\u0651\u062B \u0625\u0644\u0649 \u0648\u0643\u064A\u0644 \u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0630\u0643\u064A",
    sessionMeta: "~\u0662 \u062F  \xB7  \u064A\u0644\u0632\u0645 \u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646",
    unavailableTitle: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u062A\u064A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u062D\u0627\u0644\u064A\u064B\u0627",
    unavailableBody: "\u0633\u064A\u0639\u0648\u062F \u0642\u0631\u064A\u0628\u064B\u0627.",
    readyTitle: "\u062C\u0631\u0651\u0628 \u0627\u0644\u0648\u0643\u064A\u0644\u0629 \u0628\u0646\u0641\u0633\u0643",
    readyBody: "\u0645\u062B\u0651\u0644 \u062F\u0648\u0631 \u0627\u0644\u0639\u0645\u064A\u0644 \u0627\u0644\u0645\u062A\u0623\u062E\u0631.",
    startLabel: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u062A\u064A",
    micTitle: "\u0627\u0633\u0645\u062D \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646",
    micBody: "\u064A\u0637\u0644\u0628 \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0627\u0644\u0625\u0630\u0646. \u0644\u0646 \u064A\u062A\u0645\u0643\u0646 \u0627\u0644\u0639\u0631\u0636 \u0645\u0646 \u0633\u0645\u0627\u0639\u0643 \u0642\u0628\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629.",
    connectingTitle: "\u062C\u0627\u0631\u064D \u062A\u0648\u0635\u064A\u0644\u0643 \u0628\u0627\u0644\u0633\u0643\u0631\u062A\u064A\u0631\u0629\u2026",
    connectingBody: "\u0641\u064A \u0627\u0646\u062A\u0638\u0627\u0631 \u0623\u0646 \u062A\u0631\u062F\u0651.",
    listeningTitle: "\u0647\u064A \u062A\u0633\u062A\u0645\u0639",
    listeningBody: "\u062A\u062D\u062F\u0651\u062B \u0628\u0634\u0643\u0644 \u0637\u0628\u064A\u0639\u064A \u2014 \u0633\u062A\u0631\u062F\u0651 \u0639\u0644\u064A\u0643.",
    thinkingTitle: "\u0647\u064A \u062A\u0641\u0643\u0651\u0631",
    thinkingBody: "\u062A\u064F\u0639\u062F\u0651 \u0631\u062F\u0651\u0647\u0627 \u0627\u0644\u0622\u0646.",
    speakingTitle: "\u0647\u064A \u062A\u062A\u062D\u062F\u062B",
    speakingBody: "\u064A\u0645\u0643\u0646\u0643 \u0645\u0642\u0627\u0637\u0639\u062A\u0647\u0627 \u0641\u064A \u0623\u064A \u0648\u0642\u062A.",
    reconnectingTitle: "\u062C\u0627\u0631\u064D \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u2026",
    reconnectingBody: "\u0627\u0646\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644. \u0646\u062D\u0627\u0648\u0644 \u0627\u0633\u062A\u0626\u0646\u0627\u0641 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629.",
    finishedTitle: "\u062A\u0644\u0643 \u0643\u0627\u0646\u062A \u0633\u0643\u0631\u062A\u064A\u0631\u062A\u0646\u0627 \u0627\u0644\u0630\u0643\u064A\u0629.",
    finishedBody: "\u062A\u0641\u0639\u0644 \u0630\u0644\u0643 \u0645\u0639 \u0641\u0648\u0627\u062A\u064A\u0631 \u062D\u0642\u064A\u0642\u064A\u0629\u060C \u0641\u064A \u0645\u0643\u0627\u0644\u0645\u0627\u062A \u062D\u0642\u064A\u0642\u064A\u0629\u060C \u0643\u0644 \u064A\u0648\u0645 \u2014 \u0648\u0641\u0642 \u0642\u0648\u0627\u0639\u062F\u0643.",
    signupCta: "\u0627\u0637\u0644\u0628 \u0639\u0631\u0636\u064B\u0627 \u062A\u0648\u0636\u064A\u062D\u064A\u064B\u0627",
    restart: "\u062A\u062D\u062F\u0651\u062B \u0625\u0644\u064A\u0647\u0627 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649",
    rateLimitedVisitorTitle: "\u0644\u0642\u062F \u062C\u0631\u0651\u0628\u062A \u0639\u062F\u0629 \u0645\u0631\u0627\u062A \u0628\u0627\u0644\u0641\u0639\u0644",
    rateLimitedVisitorBody: "\u0627\u0646\u062A\u0638\u0631 \u0628\u0636\u0639 \u062F\u0642\u0627\u0626\u0642 \u0642\u0628\u0644 \u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0639\u0631\u0636 \u0645\u062C\u062F\u062F\u064B\u0627.",
    rateLimitedCapacityTitle: "\u0627\u0644\u062C\u0645\u064A\u0639 \u064A\u0631\u064A\u062F \u0627\u0644\u062A\u062D\u062F\u062B \u0625\u0644\u064A\u0647\u0627",
    rateLimitedCapacityBody: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0645\u0645\u062A\u0644\u0626 \u062D\u0627\u0644\u064A\u064B\u0627. \u062D\u0627\u0648\u0644 \u0644\u0627\u062D\u0642\u064B\u0627 \u2014 \u0623\u0648 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0637\u0627\u0628\u0648\u0631 \u0648\u062F\u0639\u0647\u0627 \u062A\u0639\u0645\u0644 \u0639\u0644\u0649 \u0641\u0648\u0627\u062A\u064A\u0631\u0643.",
    errorTitle: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644",
    retry: "\u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649",
    disconnect: "\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629",
    timeRemaining: "\u0645\u062A\u0628\u0642\u064D",
    supportIdLabel: "\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u062F\u0639\u0645",
    supportCopy: "\u0646\u0633\u062E",
    supportCopied: "\u062A\u0645 \u0627\u0644\u0646\u0633\u062E",
    consentHeading: "\u0642\u0628\u0644 \u0623\u0646 \u0646\u0628\u062F\u0623",
    consentAccept: "\u0623\u0648\u0627\u0641\u0642 \u2014 \u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629",
    consentDecline: "\u0644\u0627\u060C \u0634\u0643\u0631\u064B\u0627",
    consentPolicyLink: "\u0627\u0642\u0631\u0623 \u0627\u0644\u0633\u064A\u0627\u0633\u0629 \u0643\u0627\u0645\u0644\u0629",
    err_microphone_denied: "\u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646 \u0645\u062D\u0638\u0648\u0631.",
    err_microphone_denied_hint: "\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0631\u0645\u0632 \u0627\u0644\u0642\u0641\u0644 \u0641\u064A \u0634\u0631\u064A\u0637 \u0627\u0644\u0639\u0646\u0648\u0627\u0646\u060C \u0648\u0627\u0636\u0628\u0637 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646 \u0639\u0644\u0649 \xAB\u0627\u0644\u0633\u0645\u0627\u062D\xBB\u060C \u062B\u0645 \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0641\u062D\u0629.",
    err_microphone_unavailable: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646. \u062A\u0623\u0643\u062F \u0645\u0646 \u0639\u062F\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062A\u0637\u0628\u064A\u0642 \u0622\u062E\u0631 \u0644\u0647.",
    err_browser_unsupported: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0644\u0627 \u064A\u062F\u0639\u0645 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u062A\u064A. \u062C\u0631\u0651\u0628 Chrome \u0623\u0648 Edge \u0623\u0648 Safari.",
    err_network_error: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0636. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644\u0643 \u0648\u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u064B\u0627.",
    err_contract_violation: "\u0631\u062F\u0651 \u0627\u0644\u0639\u0631\u0636 \u0628\u0634\u064A\u0621 \u062A\u0639\u0630\u0651\u0631 \u0639\u0644\u064A\u0646\u0627 \u0642\u0631\u0627\u0621\u062A\u0647. \u062A\u0645 \u0625\u0628\u0644\u0627\u063A \u0641\u0631\u064A\u0642\u0646\u0627.",
    err_consent_policy_outdated: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629. \u064A\u0631\u062C\u0649 \u0642\u0631\u0627\u0621\u062A\u0647 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0648\u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629.",
    err_capture_unavailable: "\u062A\u0639\u0630\u0651\u0631 \u0628\u062F\u0621 \u062A\u0633\u062C\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u060C \u0644\u0630\u0644\u0643 \u062A\u0648\u0642\u0641\u0646\u0627 \u0642\u0628\u0644 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
    err_agent_unavailable: "\u0644\u0645 \u062A\u0631\u062F\u0651 \u0627\u0644\u0633\u0643\u0631\u062A\u064A\u0631\u0629. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
    err_agent_lost: "\u0627\u0646\u0642\u0637\u0639\u062A \u0627\u0644\u0633\u0643\u0631\u062A\u064A\u0631\u0629 \u0639\u0646 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
    err_transport_failed: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629.",
    err_reconnect_failed: "\u0641\u0642\u062F\u0646\u0627 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0648\u0644\u0645 \u0646\u062A\u0645\u0643\u0646 \u0645\u0646 \u0627\u0633\u062A\u0639\u0627\u062F\u062A\u0647.",
    err_consent_declined: "\u0644\u0627 \u0645\u0634\u0643\u0644\u0629 \u2014 \u0644\u0645 \u064A\u0628\u062F\u0623 \u0627\u0644\u0639\u0631\u0636.",
    err_session_expired_before_start: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u062C\u0644\u0633\u0629 \u0627\u0644\u0639\u0631\u0636 \u0642\u0628\u0644 \u0623\u0646 \u062A\u0628\u062F\u0623. \u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u064B\u0627.",
    err_demo_disabled: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0645\u062A\u0648\u0642\u0641 \u062D\u0627\u0644\u064A\u064B\u0627.",
    err_demo_unavailable: "\u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0645\u0624\u0642\u062A\u064B\u0627.",
    err_demo_capacity_reached: "\u0627\u0644\u0639\u0631\u0636 \u0645\u0645\u062A\u0644\u0626 \u062D\u0627\u0644\u064A\u064B\u0627.",
    err_rate_limited: "\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u064B\u0627. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0642\u0631\u064A\u0628\u064B\u0627.",
    err_verification_failed: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0645\u062A\u0635\u0641\u062D\u0643. \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u064B\u0627.",
    err_consent_required: "\u064A\u062D\u062A\u0627\u062C \u0627\u0644\u0639\u0631\u0636 \u0625\u0644\u0649 \u0645\u0648\u0627\u0641\u0642\u062A\u0643 \u0642\u0628\u0644 \u0623\u0646 \u064A\u0628\u062F\u0623.",
    err_invalid_request: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629 \u2014 \u062A\u0645 \u0625\u0628\u0644\u0627\u063A \u0641\u0631\u064A\u0642\u0646\u0627.",
    err_server_error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0644\u062F\u064A\u0646\u0627.",
    err_language_unavailable: "\u062A\u0639\u0630\u0631 \u062A\u062D\u062F\u064A\u062F \u0644\u063A\u0629 \u0627\u0644\u0628\u062F\u0627\u064A\u0629. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
  };
  var PACKS = { en, he, ar };
  function stringsFor(locale) {
    return PACKS[locale];
  }

  // src/client.ts
  var DemoRequestError = class extends Error {
    constructor(code, message, httpStatus = null, retryAfterSeconds = null) {
      super(message);
      this.name = "DemoRequestError";
      this.code = code;
      this.httpStatus = httpStatus;
      this.retryAfterSeconds = retryAfterSeconds;
    }
  };
  function parseRetryAfter(headers) {
    var _a;
    const raw = (_a = headers == null ? void 0 : headers.get) == null ? void 0 : _a.call(headers, "retry-after");
    if (!raw) return null;
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds;
    const asDate = Date.parse(raw);
    if (!Number.isNaN(asDate)) return Math.max(0, Math.round((asDate - Date.now()) / 1e3));
    return null;
  }
  function rateLimitScopeFor(code) {
    return code === "demo_capacity_reached" ? "global_capacity" : "per_visitor";
  }
  var PublicVoiceDemoClient = class {
    constructor(options) {
      var _a, _b;
      this.options = options;
      this.doFetch = (_a = options.fetchImpl) != null ? _a : globalThis.fetch.bind(globalThis);
      this.now = (_b = options.now) != null ? _b : () => Date.now();
    }
    get endpoint() {
      return `${this.options.baseUrl.replace(/\/+$/, "")}${this.options.path}`;
    }
    async createSession(input) {
      var _a, _b;
      if (input.language !== "he" && input.language !== "en" && input.language !== "ar") {
        throw new DemoRequestError(
          "contract_violation",
          "refusing to send a session request without a canonical language"
        );
      }
      const turnstileToken = (_b = (_a = input.turnstileToken) == null ? void 0 : _a.trim()) != null ? _b : "";
      if (this.options.requireTurnstileToken && !turnstileToken) {
        throw new DemoRequestError(
          "verification_failed",
          "refusing to send a session request without a Turnstile token"
        );
      }
      const body = { language: input.language };
      if (turnstileToken) body["turnstile_token"] = turnstileToken;
      if (input.consent) {
        body["consent"] = {
          policy_version: input.consent.policyVersion,
          locale: input.consent.locale,
          accepted_at: input.consent.acceptedAt
        };
      }
      let response;
      try {
        response = await this.doFetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Anonymous visitors: anon/publishable key only, no user token.
            apikey: this.options.anonKey
          },
          body: JSON.stringify(body),
          ...input.signal ? { signal: input.signal } : {}
        });
      } catch (cause) {
        if ((cause == null ? void 0 : cause.name) === "AbortError") throw cause;
        throw new DemoRequestError("network_error", "could not reach the demo endpoint");
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const code = readErrorCode(payload, response.status);
        if (code === "consent_required") {
          const parsed = parseRecording(this.readConsentBlock(payload));
          if (parsed.status === "ok") return { kind: "consent_required", consent: parsed.consent };
          throw new DemoRequestError(
            "contract_violation",
            parsed.status === "malformed" ? `consent demanded but ${parsed.reason}` : "consent demanded but no usable recording block was returned",
            response.status
          );
        }
        throw new DemoRequestError(
          code,
          `demo endpoint returned ${response.status}`,
          response.status,
          parseRetryAfter(response.headers)
        );
      }
      if (!this.payloadHasToken(payload)) {
        const parsed = parseRecording(this.readConsentBlock(payload));
        if (parsed.status === "ok" && parsed.consent.required) {
          return { kind: "consent_required", consent: parsed.consent };
        }
        if (parsed.status === "malformed" && parsed.required) {
          throw new DemoRequestError("contract_violation", parsed.reason, response.status);
        }
      }
      try {
        return {
          kind: "session",
          session: normalizeSession(payload, {
            now: this.now(),
            expectedLanguage: input.language
          })
        };
      } catch (cause) {
        if (cause instanceof ContractViolation) {
          throw new DemoRequestError("contract_violation", cause.message, response.status);
        }
        throw cause;
      }
    }
    readConsentBlock(payload) {
      var _a, _b, _c;
      if (!payload || typeof payload !== "object") return void 0;
      const record = payload;
      return (_c = (_b = (_a = record["recording"]) != null ? _a : record["consent"]) != null ? _b : record["recording_consent"]) != null ? _c : record;
    }
    payloadHasToken(payload) {
      if (!payload || typeof payload !== "object") return false;
      const record = payload;
      return ["token", "participant_token", "access_token", "accessToken", "participantToken"].some(
        (key) => typeof record[key] === "string" && record[key].trim().length > 0
      );
    }
  };

  // src/turnstile.ts
  var TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  var TURNSTILE_ACTION = "public_voice_demo";
  var TurnstileError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "TurnstileError";
    }
  };
  function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        `script[src^="https://challenges.cloudflare.com/turnstile/"]`
      );
      const onReady = () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new TurnstileError("turnstile script loaded but exposed no API"));
      };
      if (existing) {
        existing.addEventListener("load", onReady, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new TurnstileError("turnstile script failed to load")),
          { once: true }
        );
        return;
      }
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", onReady, { once: true });
      script.addEventListener(
        "error",
        () => reject(new TurnstileError("turnstile script failed to load")),
        { once: true }
      );
      document.head.appendChild(script);
    });
  }
  function createTurnstileProvider(options) {
    var _a, _b;
    const timeoutMs = (_a = options.timeoutMs) != null ? _a : 2e4;
    const load = (_b = options.loadScript) != null ? _b : loadTurnstileScript;
    let api = null;
    let widgetId = null;
    let container = null;
    let pending = null;
    let destroyed = false;
    function settle(fn, value) {
      const current = pending;
      pending = null;
      if (!current) return;
      if (fn === "resolve") current.resolve(value);
      else current.reject(value);
    }
    async function ensureWidget() {
      if (!api) api = await load();
      if (destroyed) throw new TurnstileError("turnstile provider was destroyed");
      if (widgetId === null) {
        container = document.createElement("div");
        container.setAttribute("aria-hidden", "true");
        container.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
        document.body.appendChild(container);
        widgetId = api.render(container, {
          sitekey: options.siteKey,
          size: "invisible",
          action: TURNSTILE_ACTION,
          callback: (token) => settle("resolve", token),
          "error-callback": (code) => settle("reject", new TurnstileError(`turnstile challenge failed${code ? `: ${code}` : ""}`)),
          "timeout-callback": () => settle("reject", new TurnstileError("turnstile challenge timed out"))
        });
      }
      return api;
    }
    return {
      /**
       * Deliberately not `async`: `pending` must be established synchronously,
       * before any await. Loading the script is asynchronous, so an async
       * function would leave a window in which a second call sails past the
       * in-flight guard and `reset()` finds nothing to cancel — orphaning the
       * first promise forever.
       */
      getToken() {
        if (destroyed) return Promise.reject(new TurnstileError("turnstile provider was destroyed"));
        if (pending) {
          return Promise.reject(new TurnstileError("a turnstile challenge is already in flight"));
        }
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            settle("reject", new TurnstileError("turnstile challenge timed out"));
          }, timeoutMs);
          pending = {
            resolve: (token) => {
              clearTimeout(timer);
              resolve(token);
            },
            reject: (error) => {
              clearTimeout(timer);
              reject(error);
            }
          };
          void ensureWidget().then((instance) => {
            if (!pending) return;
            const id = widgetId;
            if (id === null) {
              settle("reject", new TurnstileError("turnstile widget was not rendered"));
              return;
            }
            instance.reset(id);
            instance.execute(id);
          }).catch((cause) => {
            settle(
              "reject",
              cause instanceof Error ? cause : new TurnstileError(String(cause))
            );
          });
        });
      },
      reset() {
        settle("reject", new TurnstileError("turnstile challenge was reset"));
        if (api && widgetId !== null) {
          try {
            api.reset(widgetId);
          } catch (cause) {
            logger.warn("turnstile reset failed", cause);
          }
        }
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        settle("reject", new TurnstileError("turnstile provider was destroyed"));
        if (api && widgetId !== null) {
          try {
            api.remove(widgetId);
          } catch {
          }
        }
        widgetId = null;
        container == null ? void 0 : container.remove();
        container = null;
      }
    };
  }

  // src/agent.ts
  var AGENT_STATE_ATTRIBUTE = "lk.agent.state";
  var DOCUMENTED_AGENT_STATES = [
    "connecting",
    "pre-connect-buffering",
    "initializing",
    "idle",
    "listening",
    "thinking",
    "speaking",
    "disconnected",
    "failed"
  ];
  var READINESS = {
    // Not ready yet. The agent is present but cannot hear anyone.
    connecting: "pending",
    "pre-connect-buffering": "pending",
    initializing: "pending",
    idle: "pending",
    // Ready.
    listening: "ready",
    thinking: "thinking",
    speaking: "speaking",
    // Terminal.
    disconnected: "lost",
    failed: "lost"
  };
  function isDocumentedAgentState(value) {
    return DOCUMENTED_AGENT_STATES.includes(value);
  }
  function readinessFor(raw) {
    if (raw === null || raw === void 0) return "pending";
    const value = raw.trim();
    if (!isDocumentedAgentState(value)) return "pending";
    return READINESS[value];
  }

  // src/transport.ts
  var CAPTURE_TOPIC = "seenn.public_demo.capture";
  var CAPTURE_MESSAGE_TYPE = "public_demo_capture_ready";
  var CAPTURE_MESSAGE_VERSION = 1;
  var CAPTURE_TIMEOUT_MS = 1e4;
  function isCaptureReadyPayload(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    if (keys.length !== 2) return false;
    const record = value;
    return record["type"] === CAPTURE_MESSAGE_TYPE && record["version"] === CAPTURE_MESSAGE_VERSION;
  }
  var TransportError = class extends Error {
    constructor(phase, cause) {
      var _a;
      const causeName = (_a = cause == null ? void 0 : cause.name) != null ? _a : "unknown";
      super(`livekit ${phase} failed (${causeName})`);
      this.name = "TransportError";
      this.phase = phase;
      this.causeName = causeName;
    }
  };
  function isAgentParticipant(participant) {
    var _a;
    if (participant.isLocal) return false;
    if (participant.isAgent === true) return true;
    return typeof ((_a = participant.attributes) == null ? void 0 : _a[AGENT_STATE_ATTRIBUTE]) === "string";
  }
  function smooth(previous, next) {
    return next > previous ? next : previous + (next - previous) * 0.25;
  }
  function createLiveKitTransport(events, options) {
    var _a;
    let room = null;
    let rafId = 0;
    let level = 0;
    let disposed = false;
    let lastAgentState;
    const load = (_a = options.loadModule) != null ? _a : (url) => import(
      /* @vite-ignore */
      url
    );
    function stopMetering() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }
    function startMetering(lk) {
      const tick = () => {
        var _a2;
        if (disposed || !room) return;
        let peak = 0;
        const remotes = (_a2 = room.remoteParticipants) != null ? _a2 : room.participants;
        remotes == null ? void 0 : remotes.forEach((participant) => {
          if (participant.isLocal) return;
          if (typeof participant.audioLevel === "number" && participant.audioLevel > peak) {
            peak = participant.audioLevel;
          }
          if (participant.isSpeaking && peak < 0.3) peak = 0.3;
        });
        level = smooth(level, peak);
        events.onLevel(level);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }
    return {
      async connect({
        url,
        token,
        microphone,
        audioElement,
        requireCaptureMarker,
        captureTimeoutMs
      }) {
        var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
        const lk = await load(options.moduleUrl).catch((cause) => {
          logger.error("failed to load the audio engine", { module: safeUrl(options.moduleUrl) });
          throw new TransportError("module_load", cause);
        });
        const instance = new lk.Room({ adaptiveStream: true, dynacast: true });
        room = instance;
        instance.on((_a2 = lk.RoomEvent["TrackSubscribed"]) != null ? _a2 : "trackSubscribed", (...args) => {
          var _a3;
          const track2 = args[0];
          if ((track2 == null ? void 0 : track2.kind) !== lk.Track.Kind.Audio) return;
          (_a3 = track2.attach) == null ? void 0 : _a3.call(track2, audioElement);
          void audioElement.play().catch(() => void 0);
        });
        const findAgent = () => {
          var _a3;
          const remotes = (_a3 = instance.remoteParticipants) != null ? _a3 : instance.participants;
          let found;
          remotes == null ? void 0 : remotes.forEach((participant) => {
            if (!found && isAgentParticipant(participant)) found = participant;
          });
          return found;
        };
        const reportAgent = () => {
          var _a3, _b2;
          if (disposed) return;
          const agent = findAgent();
          const next = agent ? (_b2 = (_a3 = agent.attributes) == null ? void 0 : _a3[AGENT_STATE_ATTRIBUTE]) != null ? _b2 : null : null;
          if (next === lastAgentState) return;
          lastAgentState = next;
          events.onAgentState(next);
        };
        instance.on((_b = lk.RoomEvent["ParticipantConnected"]) != null ? _b : "participantConnected", reportAgent);
        instance.on((_c = lk.RoomEvent["ParticipantDisconnected"]) != null ? _c : "participantDisconnected", reportAgent);
        instance.on(
          (_d = lk.RoomEvent["ParticipantAttributesChanged"]) != null ? _d : "participantAttributesChanged",
          reportAgent
        );
        instance.on((_e = lk.RoomEvent["Reconnecting"]) != null ? _e : "reconnecting", () => events.onReconnecting());
        instance.on((_f = lk.RoomEvent["Reconnected"]) != null ? _f : "reconnected", () => events.onReconnected());
        instance.on((_g = lk.RoomEvent["Disconnected"]) != null ? _g : "disconnected", () => events.onDisconnected());
        let captureSeen = false;
        let onCapture = null;
        let onCaptureFail = null;
        if (requireCaptureMarker) {
          const reliable = (_h = lk.DataPacket_Kind) == null ? void 0 : _h.RELIABLE;
          instance.on((_i = lk.RoomEvent["DataReceived"]) != null ? _i : "dataReceived", (...args) => {
            if (captureSeen) return;
            const [payload, participant, kind, topic] = args;
            if (!participant || !isAgentParticipant(participant)) return;
            if (topic !== CAPTURE_TOPIC) return;
            if (reliable !== void 0 && kind !== void 0 && kind !== reliable) return;
            let parsed;
            try {
              parsed = JSON.parse(new TextDecoder().decode(payload));
            } catch {
              return;
            }
            if (!isCaptureReadyPayload(parsed)) return;
            captureSeen = true;
            onCapture == null ? void 0 : onCapture();
          });
          instance.on((_j = lk.RoomEvent["Disconnected"]) != null ? _j : "disconnected", () => {
            if (!captureSeen) onCaptureFail == null ? void 0 : onCaptureFail("disconnected before the capture marker");
          });
        }
        try {
          await instance.connect(url, token);
        } catch (cause) {
          throw new TransportError("room_connect", cause);
        }
        if (requireCaptureMarker && !captureSeen) {
          try {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                reject(new Error("capture marker timed out"));
              }, captureTimeoutMs != null ? captureTimeoutMs : CAPTURE_TIMEOUT_MS);
              onCapture = () => {
                clearTimeout(timer);
                resolve();
              };
              onCaptureFail = (reason) => {
                clearTimeout(timer);
                reject(new Error(reason));
              };
            });
          } catch (cause) {
            throw new TransportError("capture_handshake", cause);
          } finally {
            onCapture = null;
            onCaptureFail = null;
          }
        }
        try {
          const audioTrack = microphone.getAudioTracks()[0];
          if (audioTrack && typeof lk.LocalAudioTrack === "function") {
            await instance.localParticipant.publishTrack(new lk.LocalAudioTrack(audioTrack), {
              source: lk.Track.Source.Microphone
            });
          } else {
            await instance.localParticipant.setMicrophoneEnabled(true);
          }
        } catch (cause) {
          throw new TransportError("microphone_publish", cause);
        }
        await ((_k = instance.startAudio) == null ? void 0 : _k.call(instance).catch(() => void 0));
        startMetering(lk);
        events.onConnected();
        reportAgent();
      },
      async disconnect() {
        disposed = true;
        stopMetering();
        const instance = room;
        room = null;
        if (!instance) return;
        try {
          await instance.disconnect();
        } catch {
        }
      }
    };
  }

  // src/state.ts
  var ACTIVE_STATES = [
    "requestingMicrophone",
    "connecting",
    "listening",
    "assistantThinking",
    "assistantSpeaking",
    "reconnecting"
  ];
  var AGENT_READY_STATES = [
    "listening",
    "assistantThinking",
    "assistantSpeaking"
  ];
  var STARTABLE = ["ready", "finished", "error", "rateLimited"];
  function initialContext(unavailable) {
    return {
      state: unavailable ? "unavailable" : "ready",
      errorCode: null,
      rateLimitScope: null,
      finishReason: null,
      unavailableReason: unavailable,
      pendingConsent: null,
      acceptedConsent: null,
      session: null,
      connectionInFlight: false,
      attempt: 0,
      roomConnected: false,
      lastSessionId: null,
      retryAfterUntil: null
    };
  }
  function agentIsReady(state) {
    return AGENT_READY_STATES.includes(state);
  }
  function isActive(state) {
    return ACTIVE_STATES.includes(state);
  }
  function reduce(context, event) {
    var _a, _b;
    const { state } = context;
    switch (event.type) {
      case "FLAG_ENABLED":
        if (state !== "unavailable") return context;
        return { ...context, state: "ready", unavailableReason: null };
      case "FLAG_DISABLED":
        if (state === "unavailable") return context;
        return {
          ...initialContext(event.reason),
          attempt: context.attempt
        };
      case "START":
        if (!STARTABLE.includes(state) || context.connectionInFlight) return context;
        if (context.retryAfterUntil !== null && event.at < context.retryAfterUntil) return context;
        return {
          ...initialContext(null),
          state: "requestingMicrophone",
          // Consent already accepted this page-view carries forward, so a retry
          // does not re-prompt for the same policy version.
          acceptedConsent: context.acceptedConsent,
          connectionInFlight: true,
          attempt: context.attempt + 1
        };
      case "MIC_GRANTED":
        if (state !== "requestingMicrophone") return context;
        return { ...context, state: "connecting" };
      case "MIC_DENIED":
        if (state !== "requestingMicrophone") return context;
        return {
          ...context,
          state: "error",
          errorCode: "microphone_denied",
          connectionInFlight: false
        };
      case "MIC_UNAVAILABLE":
        if (state !== "requestingMicrophone") return context;
        return {
          ...context,
          state: "error",
          errorCode: "microphone_unavailable",
          connectionInFlight: false
        };
      case "CONSENT_REQUIRED":
        if (state !== "connecting") return context;
        return { ...context, pendingConsent: event.consent };
      case "CONSENT_ACCEPTED": {
        if (state !== "connecting" || !context.pendingConsent) return context;
        const consent = context.pendingConsent;
        return {
          ...context,
          pendingConsent: null,
          acceptedConsent: {
            policyVersion: consent.policyVersion,
            locale: consent.locale,
            acceptedAt: event.acceptedAt
          }
        };
      }
      case "CONSENT_DECLINED":
        if (state !== "connecting") return context;
        return {
          ...context,
          state: "finished",
          finishReason: "user_disconnected",
          pendingConsent: null,
          connectionInFlight: false
        };
      case "SESSION_GRANTED":
        if (state !== "connecting") return context;
        return {
          ...context,
          session: event.session,
          // Kept past teardown so a failure can show a Support ID.
          lastSessionId: event.session.sessionId
        };
      case "ROOM_CONNECTED":
        if (state !== "connecting") return context;
        return { ...context, roomConnected: true };
      case "AGENT_PENDING":
        if (state !== "connecting") return context;
        return context;
      case "AGENT_READY":
        if (state !== "connecting" && !AGENT_READY_STATES.includes(state)) return context;
        if (state === "listening") return context;
        return { ...context, state: "listening" };
      case "AGENT_THINKING":
        if (state !== "connecting" && !AGENT_READY_STATES.includes(state)) return context;
        if (state === "assistantThinking") return context;
        return { ...context, state: "assistantThinking" };
      case "AGENT_SPEAKING":
        if (state !== "connecting" && !AGENT_READY_STATES.includes(state)) return context;
        if (state === "assistantSpeaking") return context;
        return { ...context, state: "assistantSpeaking" };
      case "RECONNECTING":
        if (!AGENT_READY_STATES.includes(state)) return context;
        return { ...context, state: "reconnecting" };
      case "RECONNECTED":
        if (state !== "reconnecting") return context;
        return { ...context, state: "listening" };
      case "DISCONNECT":
        if (!isActive(state)) return context;
        return {
          ...context,
          state: "finished",
          finishReason: event.reason,
          pendingConsent: null,
          session: null,
          connectionInFlight: false
        };
      case "RATE_LIMITED": {
        if (state !== "connecting" && state !== "requestingMicrophone") return context;
        const seconds = (_a = event.retryAfterSeconds) != null ? _a : null;
        const from = (_b = event.at) != null ? _b : 0;
        return {
          ...context,
          state: "rateLimited",
          rateLimitScope: event.scope,
          retryAfterUntil: seconds !== null && seconds > 0 ? from + seconds * 1e3 : null,
          pendingConsent: null,
          session: null,
          connectionInFlight: false
        };
      }
      case "DEMO_UNAVAILABLE":
        if (state === "unavailable") return context;
        return { ...initialContext(event.reason), attempt: context.attempt };
      case "ERROR":
        if (state === "unavailable" || state === "error") return context;
        return {
          ...context,
          state: "error",
          errorCode: event.code,
          pendingConsent: null,
          // The live session goes; its identifier stays, so support can be given
          // something to quote.
          session: null,
          connectionInFlight: false
        };
      case "RESET":
        if (state === "unavailable") return context;
        return {
          ...initialContext(null),
          acceptedConsent: context.acceptedConsent,
          attempt: context.attempt,
          // A server asked us to back off; clearing the UI does not clear that.
          retryAfterUntil: context.retryAfterUntil
        };
      default: {
        const never = event;
        return never;
      }
    }
  }

  // src/widget.ts
  var ORB_MODIFIER = {
    unavailable: "failed",
    ready: "idle",
    requestingMicrophone: "prompting",
    connecting: "submitting",
    listening: "dialing",
    assistantThinking: "submitting",
    assistantSpeaking: "dialing",
    reconnecting: "submitting",
    finished: "onTheWay",
    rateLimited: "failed",
    error: "failed"
  };
  var ICONS = {
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    hangUp: '<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><path d="M22 2 2 22"/>',
    spinner: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
    retry: '<path d="M3 10h6V4"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L3 10"/>',
    blocked: '<path d="M4.9 4.9 19.1 19.1"/><circle cx="12" cy="12" r="9"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  var LANGUAGE_LOOKUP_ATTEMPTS = 2;
  function icon(paths, className = "") {
    return `<svg class="${className}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }
  function mmss(seconds) {
    const total = Math.max(0, Math.round(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }
  function track(event, params = {}) {
    try {
      const gtag = window.gtag;
      gtag == null ? void 0 : gtag("event", event, { event_category: "voice_demo", ...params });
    } catch {
    }
  }
  var VoiceDemoWidget = class {
    constructor(mount, config, deps = {}) {
      this.transport = null;
      this.turnstile = null;
      this.microphone = null;
      this.abortController = null;
      this.consentDecision = null;
      /**
       * Which leg of the real-time connection last failed. Reported to analytics
       * and the console so a future failure is diagnosable without a repro; never
       * shown to the visitor, and never carries a token or device detail.
       */
      this.lastTransportPhase = null;
      /** The agent no-show timer, held separately so readiness can cancel it. */
      this.agentTimeout = null;
      this.timers = [];
      this.tickTimer = null;
      this.deadline = 0;
      this.destroyed = false;
      this.coreVideo = null;
      /** Guards a second catalog fetch while one is already in flight. */
      this.gateLoading = false;
      /** Canonical language the shown catalog row was fetched for. */
      this.gateLanguage = null;
      /** Focus to hand back when the dialog closes. */
      this.gateReturnFocus = null;
      /** Guards against a second start between agreeing and the session existing. */
      this.gateStarting = false;
      this.onPageHide = () => {
        void this.disconnect("page_hidden");
      };
      this.mountObserver = null;
      /**
       * Escape closes, and Tab is trapped inside the panel. Capture phase so the
       * page behind the dialog never sees either.
       */
      this.onGateKeydown = (event) => {
        if (this.gate.hidden) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          this.closeGate();
          return;
        }
        if (event.key !== "Tab") return;
        const focusables = Array.from(
          this.gatePanel.querySelectorAll("a[href], button:not([disabled])")
        ).filter((el) => !el.hidden);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      };
      var _a, _b, _c, _d;
      this.mount = mount;
      this.config = config;
      this.deps = deps;
      this.now = (_a = deps.now) != null ? _a : () => Date.now();
      this.client = (_c = (_b = deps.createClient) == null ? void 0 : _b.call(deps, config)) != null ? _c : new PublicVoiceDemoClient({
        baseUrl: config.endpointBaseUrl,
        anonKey: config.anonKey,
        path: config.endpointPath,
        // A configured site key makes the token mandatory, in the client, so
        // no code path can post without one.
        requireTurnstileToken: config.turnstileSiteKey !== "",
        now: this.now
      });
      this.makeTransport = (_d = deps.createTransport) != null ? _d : (events) => createLiveKitTransport(events, { moduleUrl: config.livekitModuleUrl });
      this.locale = resolveLocale(config.locale, document.documentElement.getAttribute("lang"));
      this.strings = stringsFor(this.locale);
      this.consentGate = new ConsentGate(config.recordingConsentMode);
      this.context = initialContext(unavailableReason(config));
      this.build();
      this.render();
      this.watchLifecycle();
    }
    get state() {
      return this.context.state;
    }
    get snapshot() {
      return this.context;
    }
    /** Browser joined the room. Diagnostic only — never treat as readiness. */
    get transportConnected() {
      return this.context.roomConnected;
    }
    /** The backend session id, surviving teardown so support can quote it. */
    get supportId() {
      return this.context.lastSessionId;
    }
    // --- DOM ----------------------------------------------------------------
    build() {
      const root = document.createElement("div");
      root.className = "svd";
      root.setAttribute("dir", directionFor(this.locale));
      root.lang = this.locale;
      const size = this.config.orbSize;
      root.innerHTML = `
      <div class="svd__rule" aria-hidden="true"></div>
      <div class="svd__wave" aria-hidden="true">
        <svg viewBox="0 0 400 80" preserveAspectRatio="none" focusable="false">
          <g class="svd__wave-track">
            <path class="svd__wave-line svd__wave-line--back" d="M0,40.0 L4,42.8 L8,45.5 L12,48.1 L16,50.6 L20,52.9 L24,55.1 L28,57.0 L32,58.6 L36,59.9 L40,60.9 L44,61.6 L48,62.0 L52,62.0 L56,61.6 L60,60.9 L64,59.9 L68,58.6 L72,57.0 L76,55.1 L80,52.9 L84,50.6 L88,48.1 L92,45.5 L96,42.8 L100,40.0 L104,37.2 L108,34.5 L112,31.9 L116,29.4 L120,27.1 L124,24.9 L128,23.0 L132,21.4 L136,20.1 L140,19.1 L144,18.4 L148,18.0 L152,18.0 L156,18.4 L160,19.1 L164,20.1 L168,21.4 L172,23.0 L176,24.9 L180,27.1 L184,29.4 L188,31.9 L192,34.5 L196,37.2 L200,40.0 L204,42.8 L208,45.5 L212,48.1 L216,50.6 L220,52.9 L224,55.1 L228,57.0 L232,58.6 L236,59.9 L240,60.9 L244,61.6 L248,62.0 L252,62.0 L256,61.6 L260,60.9 L264,59.9 L268,58.6 L272,57.0 L276,55.1 L280,52.9 L284,50.6 L288,48.1 L292,45.5 L296,42.8 L300,40.0 L304,37.2 L308,34.5 L312,31.9 L316,29.4 L320,27.1 L324,24.9 L328,23.0 L332,21.4 L336,20.1 L340,19.1 L344,18.4 L348,18.0 L352,18.0 L356,18.4 L360,19.1 L364,20.1 L368,21.4 L372,23.0 L376,24.9 L380,27.1 L384,29.4 L388,31.9 L392,34.5 L396,37.2 L400,40.0 L404,42.8 L408,45.5 L412,48.1 L416,50.6 L420,52.9 L424,55.1 L428,57.0 L432,58.6 L436,59.9 L440,60.9 L444,61.6 L448,62.0 L452,62.0 L456,61.6 L460,60.9 L464,59.9 L468,58.6 L472,57.0 L476,55.1 L480,52.9 L484,50.6 L488,48.1 L492,45.5 L496,42.8 L500,40.0 L504,37.2 L508,34.5 L512,31.9 L516,29.4 L520,27.1 L524,24.9 L528,23.0 L532,21.4 L536,20.1 L540,19.1 L544,18.4 L548,18.0 L552,18.0 L556,18.4 L560,19.1 L564,20.1 L568,21.4 L572,23.0 L576,24.9 L580,27.1 L584,29.4 L588,31.9 L592,34.5 L596,37.2 L600,40.0 L604,42.8 L608,45.5 L612,48.1 L616,50.6 L620,52.9 L624,55.1 L628,57.0 L632,58.6 L636,59.9 L640,60.9 L644,61.6 L648,62.0 L652,62.0 L656,61.6 L660,60.9 L664,59.9 L668,58.6 L672,57.0 L676,55.1 L680,52.9 L684,50.6 L688,48.1 L692,45.5 L696,42.8 L700,40.0 L704,37.2 L708,34.5 L712,31.9 L716,29.4 L720,27.1 L724,24.9 L728,23.0 L732,21.4 L736,20.1 L740,19.1 L744,18.4 L748,18.0 L752,18.0 L756,18.4 L760,19.1 L764,20.1 L768,21.4 L772,23.0 L776,24.9 L780,27.1 L784,29.4 L788,31.9 L792,34.5 L796,37.2 L800,40.0"/>
            <path class="svd__wave-line" d="M0,40.0 L4,42.8 L8,45.5 L12,48.1 L16,50.6 L20,52.9 L24,55.1 L28,57.0 L32,58.6 L36,59.9 L40,60.9 L44,61.6 L48,62.0 L52,62.0 L56,61.6 L60,60.9 L64,59.9 L68,58.6 L72,57.0 L76,55.1 L80,52.9 L84,50.6 L88,48.1 L92,45.5 L96,42.8 L100,40.0 L104,37.2 L108,34.5 L112,31.9 L116,29.4 L120,27.1 L124,24.9 L128,23.0 L132,21.4 L136,20.1 L140,19.1 L144,18.4 L148,18.0 L152,18.0 L156,18.4 L160,19.1 L164,20.1 L168,21.4 L172,23.0 L176,24.9 L180,27.1 L184,29.4 L188,31.9 L192,34.5 L196,37.2 L200,40.0 L204,42.8 L208,45.5 L212,48.1 L216,50.6 L220,52.9 L224,55.1 L228,57.0 L232,58.6 L236,59.9 L240,60.9 L244,61.6 L248,62.0 L252,62.0 L256,61.6 L260,60.9 L264,59.9 L268,58.6 L272,57.0 L276,55.1 L280,52.9 L284,50.6 L288,48.1 L292,45.5 L296,42.8 L300,40.0 L304,37.2 L308,34.5 L312,31.9 L316,29.4 L320,27.1 L324,24.9 L328,23.0 L332,21.4 L336,20.1 L340,19.1 L344,18.4 L348,18.0 L352,18.0 L356,18.4 L360,19.1 L364,20.1 L368,21.4 L372,23.0 L376,24.9 L380,27.1 L384,29.4 L388,31.9 L392,34.5 L396,37.2 L400,40.0 L404,42.8 L408,45.5 L412,48.1 L416,50.6 L420,52.9 L424,55.1 L428,57.0 L432,58.6 L436,59.9 L440,60.9 L444,61.6 L448,62.0 L452,62.0 L456,61.6 L460,60.9 L464,59.9 L468,58.6 L472,57.0 L476,55.1 L480,52.9 L484,50.6 L488,48.1 L492,45.5 L496,42.8 L500,40.0 L504,37.2 L508,34.5 L512,31.9 L516,29.4 L520,27.1 L524,24.9 L528,23.0 L532,21.4 L536,20.1 L540,19.1 L544,18.4 L548,18.0 L552,18.0 L556,18.4 L560,19.1 L564,20.1 L568,21.4 L572,23.0 L576,24.9 L580,27.1 L584,29.4 L588,31.9 L592,34.5 L596,37.2 L600,40.0 L604,42.8 L608,45.5 L612,48.1 L616,50.6 L620,52.9 L624,55.1 L628,57.0 L632,58.6 L636,59.9 L640,60.9 L644,61.6 L648,62.0 L652,62.0 L656,61.6 L660,60.9 L664,59.9 L668,58.6 L672,57.0 L676,55.1 L680,52.9 L684,50.6 L688,48.1 L692,45.5 L696,42.8 L700,40.0 L704,37.2 L708,34.5 L712,31.9 L716,29.4 L720,27.1 L724,24.9 L728,23.0 L732,21.4 L736,20.1 L740,19.1 L744,18.4 L748,18.0 L752,18.0 L756,18.4 L760,19.1 L764,20.1 L768,21.4 L772,23.0 L776,24.9 L780,27.1 L784,29.4 L788,31.9 L792,34.5 L796,37.2 L800,40.0"/>
          </g>
        </svg>
      </div>
      <div class="svd__body">
      <div class="svd__stage">
        <div class="preview-orb" style="width:${size}px;height:${size}px">
          <span class="preview-orb__glow" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--a" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--b" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--c" aria-hidden="true"></span>
          <span class="preview-orb__wisp" aria-hidden="true"></span>
          <span class="preview-orb__rim" aria-hidden="true"></span>
          <span class="svd__core-slot" aria-hidden="true"></span>
          <span class="svd__ripples" aria-hidden="true"></span>
          <span class="svd__level" aria-hidden="true"></span>
          <button type="button" class="preview-orb__call"></button>
        </div>
      </div>
      <div class="svd__copy">
        <p class="svd__headline"></p>
        <p class="svd__sub"></p>
        <p class="svd__hint"></p>
      </div>
      </div>
      <div class="svd__bars" aria-hidden="true"></div>
      <button type="button" class="svd__start">
        <span class="svd__start-icon" aria-hidden="true"></span>
        <span class="svd__start-label"></span>
      </button>
      <p class="svd__meta"></p>
      <!--
        Pre-flight recording disclosure. Sits between the control and the
        "~2 minutes" line so it is read before the button is pressed, not
        after. Rendered only when recordingConsentMode is 'required'.
      -->
      <p class="svd__rec" hidden>
        <span class="svd__rec-icon" aria-hidden="true"></span>
        <span class="svd__rec-text"></span>
        <span class="svd__rec-sep" aria-hidden="true">\xB7</span>
        <button type="button" class="svd__rec-details"></button>
      </p>
      <div class="svd__gate" hidden>
        <div class="svd__gate-scrim" data-gate-dismiss></div>
        <div class="svd__gate-panel" role="dialog" aria-modal="true"
             aria-labelledby="svd-gate-title" aria-describedby="svd-gate-body">
          <h2 class="svd__gate-title" id="svd-gate-title"></h2>
          <div class="svd__gate-body" id="svd-gate-body">
            <!-- Written once, from the catalog, in openGate(). Never
                 pre-populated: an empty dialog is the correct state until the
                 backend has said what the sentence is. -->
            <p class="svd__gate-text"></p>
          </div>
          <a class="svd__gate-policy" target="_blank" rel="noopener noreferrer"></a>
          <div class="svd__gate-actions">
            <button type="button" class="svd__gate-back" data-gate-dismiss></button>
            <button type="button" class="svd__gate-agree"></button>
          </div>
        </div>
      </div>
      <div class="svd__consent" role="group" hidden>
        <p class="svd__consent-heading"></p>
        <p class="svd__consent-text"></p>
        <a class="svd__consent-link" target="_blank" rel="noopener noreferrer" hidden></a>
        <div class="svd__consent-actions">
          <button type="button" class="svd__consent-accept"></button>
          <button type="button" class="svd__consent-decline"></button>
        </div>
      </div>
      <div class="svd__support" hidden>
        <span class="svd__support-label"></span>
        <code class="svd__support-id"></code>
        <button type="button" class="svd__support-copy"></button>
      </div>
      <button type="button" class="svd__disconnect" hidden></button>
      <div class="svd__cta" hidden>
        <a class="svd__cta-button" href="#"></a>
      </div>
      <audio class="svd__audio" playsinline></audio>
      <span class="svd__sr-only" role="status" aria-live="polite"></span>
    `;
      const q = (selector) => {
        const el = root.querySelector(selector);
        if (!el) throw new Error(`voice-demo: missing ${selector}`);
        return el;
      };
      this.root = root;
      this.orb = q(".preview-orb");
      this.primaryButton = q(".preview-orb__call");
      this.disconnectButton = q(".svd__disconnect");
      this.headline = q(".svd__headline");
      this.body = q(".svd__sub");
      this.hint = q(".svd__hint");
      this.buildBars();
      this.startButton = q(".svd__start");
      this.sessionMeta = q(".svd__meta");
      const startIcon = this.root.querySelector(".svd__start-icon");
      if (startIcon) startIcon.innerHTML = icon(ICONS.mic, "svd__start-mic");
      this.recNotice = q(".svd__rec");
      this.recText = q(".svd__rec-text");
      this.recDetails = q(".svd__rec-details");
      const recIcon = this.root.querySelector(".svd__rec-icon");
      if (recIcon) recIcon.innerHTML = icon(ICONS.lock, "svd__rec-lock");
      this.gate = q(".svd__gate");
      this.gatePanel = q(".svd__gate-panel");
      this.gateTitle = q(".svd__gate-title");
      this.gateText = q(".svd__gate-text");
      this.gatePolicy = q(".svd__gate-policy");
      this.gateBack = q(".svd__gate-back");
      this.gateAgree = q(".svd__gate-agree");
      this.consentPanel = q(".svd__consent");
      this.consentText = q(".svd__consent-text");
      this.consentLink = q(".svd__consent-link");
      this.consentAccept = q(".svd__consent-accept");
      this.consentDecline = q(".svd__consent-decline");
      this.supportPanel = q(".svd__support");
      this.supportLabel = q(".svd__support-label");
      this.supportValue = q(".svd__support-id");
      this.supportCopy = q(".svd__support-copy");
      this.ctaWrap = q(".svd__cta");
      this.ctaLink = q(".svd__cta-button");
      this.audioElement = q(".svd__audio");
      this.liveRegion = q(".svd__sr-only");
      this.audioElement.autoplay = true;
      this.mountCore();
      this.startButton.addEventListener("click", () => {
        void this.onPrimaryAction();
      });
      this.primaryButton.addEventListener("click", () => {
        void this.onPrimaryAction();
      });
      this.disconnectButton.addEventListener("click", () => {
        void this.disconnect("user_disconnected");
      });
      this.supportCopy.addEventListener("click", () => {
        var _a, _b;
        const id = this.context.lastSessionId;
        if (!id) return;
        void ((_b = (_a = navigator.clipboard) == null ? void 0 : _a.writeText) == null ? void 0 : _b.call(_a, id).catch(() => void 0));
        this.supportCopy.textContent = this.strings.supportCopied;
      });
      this.recDetails.addEventListener("click", () => this.openGate());
      this.gateAgree.addEventListener("click", () => {
        void this.onGateAgree();
      });
      this.gate.querySelectorAll("[data-gate-dismiss]").forEach((el) => {
        el.addEventListener("click", () => this.closeGate());
      });
      this.consentAccept.addEventListener("click", () => {
        var _a;
        return (_a = this.consentDecision) == null ? void 0 : _a.call(this, true);
      });
      this.consentDecline.addEventListener("click", () => {
        var _a;
        return (_a = this.consentDecision) == null ? void 0 : _a.call(this, false);
      });
      this.ctaLink.addEventListener("click", (event) => {
        track("voice_demo_cta_click", { voice_demo_state: this.context.state });
        const openDemoModal = window.openDemoModal;
        if (typeof openDemoModal === "function") {
          event.preventDefault();
          openDemoModal();
        }
      });
      this.mount.appendChild(root);
    }
    /**
     * Swaps the placeholder for the looping video core.
     *
     * Muted, playsInline and decorative: it carries no audio track at all, so
     * there is nothing that could autoplay. Under prefers-reduced-motion it is
     * left paused on its first frame rather than removed, so the orb keeps its
     * depth without moving.
     */
    mountCore() {
      const slot = this.root.querySelector(".svd__core-slot");
      if (!slot || !this.config.coreSrc) return;
      const video = document.createElement("video");
      video.className = "preview-orb__core";
      video.src = this.config.coreSrc;
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.tabIndex = -1;
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-hidden", "true");
      video.setAttribute("disableremoteplayback", "");
      video.preload = "auto";
      slot.replaceWith(video);
      this.coreVideo = video;
      if (this.prefersReducedMotion()) {
        video.pause();
        return;
      }
      const played = video.play();
      if (played && typeof played.catch === "function") played.catch(() => void 0);
    }
    /**
     * The equaliser. Bars are built once with a fixed pseudo-random rhythm so
     * the row reads as a voice signature rather than a uniform comb, and each
     * carries its own phase offset so they ripple instead of pulsing in unison.
     */
    buildBars() {
      const host = this.root.querySelector(".svd__bars");
      if (!host) return;
      const SEED = [
        0.42,
        0.78,
        0.35,
        0.9,
        0.55,
        0.28,
        0.68,
        1,
        0.48,
        0.82,
        0.36,
        0.72,
        0.95,
        0.5,
        0.3,
        0.86,
        0.44,
        0.66,
        0.98,
        0.4,
        0.74,
        0.52,
        0.88,
        0.33,
        0.7,
        0.46,
        0.92,
        0.6,
        0.38,
        0.8,
        0.5,
        0.26
      ];
      for (let i = 0; i < SEED.length; i += 1) {
        const bar = document.createElement("span");
        bar.className = "svd__bar";
        bar.style.setProperty("--h", String(SEED[i]));
        bar.style.setProperty("--d", `${i % 7 * -0.13}s`);
        host.appendChild(bar);
      }
    }
    prefersReducedMotion() {
      return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    dispatch(event) {
      const next = reduce(this.context, event);
      if (next === this.context) return false;
      this.context = next;
      this.render();
      return true;
    }
    render() {
      var _a, _b;
      if (this.destroyed) return;
      const { state, pendingConsent } = this.context;
      const s = this.strings;
      this.root.setAttribute("data-state", state);
      this.root.setAttribute("dir", directionFor(this.locale));
      this.root.lang = this.locale;
      this.root.classList.toggle("svd--consent", pendingConsent !== null);
      if (this.coreVideo && !this.prefersReducedMotion()) {
        this.coreVideo.playbackRate = state === "assistantSpeaking" ? 1.35 : state === "assistantThinking" ? 1.15 : 0.75;
      }
      this.orb.className = `preview-orb preview-orb--${ORB_MODIFIER[state]}` + (state === "assistantSpeaking" ? " preview-orb--reactive" : "");
      const ripples = this.root.querySelector(".svd__ripples");
      if (ripples) {
        ripples.innerHTML = state === "assistantSpeaking" ? '<span class="preview-orb__ripple"></span><span class="preview-orb__ripple preview-orb__ripple--2"></span><span class="preview-orb__ripple preview-orb__ripple--3"></span>' : "";
      }
      const copy = this.copyFor();
      this.headline.textContent = copy.title;
      this.body.textContent = copy.body;
      this.hint.textContent = (_a = copy.hint) != null ? _a : "";
      this.hint.hidden = !copy.hint;
      const offerStart = state === "ready" || state === "finished" || state === "error" || state === "rateLimited";
      const startLabel = this.startButton.querySelector(".svd__start-label");
      if (startLabel) startLabel.textContent = state === "ready" ? s.startButton : s.retry;
      this.startButton.hidden = !offerStart;
      this.sessionMeta.textContent = s.sessionMeta;
      this.sessionMeta.hidden = state !== "ready";
      const c = consentStringsFor(this.locale);
      this.recText.textContent = c.disclosure;
      this.recDetails.textContent = c.detailsLabel;
      this.recNotice.hidden = !this.consentGate.required || state !== "ready";
      this.gateTitle.textContent = c.dialogTitle;
      this.gatePolicy.textContent = c.privacyLabel;
      this.gatePolicy.href = (_b = PRIVACY_POLICY_URLS[this.locale]) != null ? _b : PRIVACY_POLICY_URLS.en;
      this.gateBack.textContent = c.goBackLabel;
      this.gateAgree.textContent = c.agreeLabel;
      const busy = state === "requestingMicrophone" || state === "connecting" || state === "reconnecting";
      this.primaryButton.disabled = busy || state === "unavailable" || pendingConsent !== null;
      this.primaryButton.innerHTML = state === "listening" || state === "assistantSpeaking" ? icon(ICONS.hangUp) : busy ? icon(ICONS.spinner, "svd-spin") : state === "unavailable" ? icon(ICONS.blocked) : state === "ready" ? icon(ICONS.mic) : icon(ICONS.retry);
      const label = state === "listening" || state === "assistantSpeaking" ? s.disconnect : state === "ready" ? s.startLabel : s.retry;
      this.primaryButton.setAttribute("aria-label", label);
      this.primaryButton.setAttribute("title", label);
      const canDisconnect = isActive(state);
      this.disconnectButton.hidden = !canDisconnect;
      this.disconnectButton.textContent = s.disconnect;
      this.consentPanel.hidden = pendingConsent === null;
      if (pendingConsent) {
        const heading = this.root.querySelector(".svd__consent-heading");
        if (heading) heading.textContent = s.consentHeading;
        this.consentText.textContent = pendingConsent.text;
        this.consentAccept.textContent = s.consentAccept;
        this.consentDecline.textContent = s.consentDecline;
        if (pendingConsent.policyUrl) {
          this.consentLink.href = pendingConsent.policyUrl;
          this.consentLink.textContent = s.consentPolicyLink;
          this.consentLink.hidden = false;
        } else {
          this.consentLink.hidden = true;
        }
      }
      const agentFailure = this.config.showSupportId && state === "error" && (this.context.errorCode === "agent_unavailable" || this.context.errorCode === "agent_lost");
      const supportId = this.context.lastSessionId;
      this.supportPanel.hidden = !(agentFailure && supportId);
      if (agentFailure && supportId) {
        this.supportLabel.textContent = s.supportIdLabel;
        this.supportValue.textContent = supportId;
        this.supportCopy.textContent = s.supportCopy;
      }
      const showCta = state === "finished" || state === "rateLimited";
      this.ctaWrap.hidden = !showCta;
      this.ctaLink.textContent = s.signupCta;
      this.ctaLink.href = `${this.config.signupUrl}?utm_source=website&utm_medium=voice_demo&utm_campaign=hero_orb`;
      this.liveRegion.textContent = `${copy.title}. ${copy.body}`;
    }
    copyFor() {
      var _a;
      const s = this.strings;
      const { state, errorCode, rateLimitScope } = this.context;
      switch (state) {
        case "unavailable":
          return { title: s.unavailableTitle, body: s.unavailableBody };
        case "ready":
          return { title: s.readyTitle, body: s.readyBody };
        case "requestingMicrophone":
          return { title: s.micTitle, body: s.micBody };
        case "connecting":
          return { title: s.connectingTitle, body: s.connectingBody };
        case "listening":
          return { title: s.listeningTitle, body: `${s.listeningBody} ${this.remainingLabel()}` };
        case "assistantThinking":
          return { title: s.thinkingTitle, body: `${s.thinkingBody} ${this.remainingLabel()}` };
        case "assistantSpeaking":
          return { title: s.speakingTitle, body: `${s.speakingBody} ${this.remainingLabel()}` };
        case "reconnecting":
          return { title: s.reconnectingTitle, body: s.reconnectingBody };
        case "finished":
          return { title: s.finishedTitle, body: s.finishedBody };
        case "rateLimited":
          return rateLimitScope === "global_capacity" ? { title: s.rateLimitedCapacityTitle, body: s.rateLimitedCapacityBody } : { title: s.rateLimitedVisitorTitle, body: s.rateLimitedVisitorBody };
        case "error": {
          const key = errorCode === "invalid_language" ? "err_language_unavailable" : `err_${errorCode != null ? errorCode : "server_error"}`;
          const body = (_a = s[key]) != null ? _a : s.err_server_error;
          const hint = errorCode === "microphone_denied" ? s.err_microphone_denied_hint : void 0;
          return hint ? { title: s.errorTitle, body, hint } : { title: s.errorTitle, body };
        }
      }
    }
    remainingLabel() {
      if (!this.deadline) return "";
      return `${mmss((this.deadline - this.now()) / 1e3)} ${this.strings.timeRemaining}.`;
    }
    // --- Flow ---------------------------------------------------------------
    async onPrimaryAction() {
      if (isActive(this.context.state)) {
        await this.disconnect("user_disconnected");
        return;
      }
      if (this.consentGate.required && !this.consentGate.approved) {
        await this.openGate();
        return;
      }
      await this.start();
    }
    // --- Recording consent gate ---------------------------------------------
    /**
     * Resolves the session's language, fetches the catalog row for it, and only
     * then shows a dialog. Any failure along the way is terminal for this
     * gesture: we will not invent wording, and we will not let a visitor agree
     * to a sentence we could not load.
     */
    async openGate() {
      if (!this.gate.hidden || this.gateLoading) return;
      this.gateLoading = true;
      this.startButton.disabled = true;
      try {
        const language = await this.resolveInitialLanguage();
        if (this.destroyed) return;
        if (!language) {
          this.dispatch({ type: "ERROR", code: "contract_violation" });
          return;
        }
        const result = await fetchConsentCatalog({
          url: `${this.config.endpointBaseUrl.replace(/\/+$/, "")}${this.config.consentCatalogPath}`,
          locale: language,
          anonKey: this.config.anonKey,
          expectedVersion: CONSENT_POLICY_VERSION,
          timeoutMs: this.config.consentCatalogTimeoutMs
        });
        if (this.destroyed) return;
        if (result.status !== "ok") {
          logger.error(`consent unavailable: ${result.reason}`);
          this.dispatch({ type: "ERROR", code: "contract_violation" });
          return;
        }
        this.gateLanguage = language;
        this.consentGate.present(result.entry);
        this.gateText.textContent = result.entry.text;
        this.showGate();
      } finally {
        this.gateLoading = false;
        this.startButton.disabled = false;
      }
    }
    showGate() {
      this.gateReturnFocus = document.activeElement;
      this.gate.hidden = false;
      this.root.classList.add("svd--gated");
      this.gateBack.focus();
      document.addEventListener("keydown", this.onGateKeydown, true);
    }
    closeGate() {
      if (this.gate.hidden) return;
      this.gate.hidden = true;
      this.consentGate.revoke();
      this.gateLanguage = null;
      this.root.classList.remove("svd--gated");
      document.removeEventListener("keydown", this.onGateKeydown, true);
      const restore = this.gateReturnFocus;
      this.gateReturnFocus = null;
      if (restore && document.contains(restore)) restore.focus();
    }
    /**
     * The one affirmative path. Guarded so a double click, or a click plus a
     * keyboard activation, cannot produce two sessions: the flag is raised
     * before any await and only ever lowered once the start has settled.
     */
    async onGateAgree() {
      if (this.gateStarting || this.gate.hidden) return;
      this.gateStarting = true;
      const receipt = this.consentGate.approve(new Date(this.now()));
      const language = this.gateLanguage;
      if (!receipt || !language || receipt.locale !== language) {
        this.gateStarting = false;
        this.closeGate();
        this.dispatch({ type: "ERROR", code: "contract_violation" });
        return;
      }
      this.gate.hidden = true;
      this.root.classList.remove("svd--gated");
      document.removeEventListener("keydown", this.onGateKeydown, true);
      this.gateReturnFocus = null;
      try {
        this.consentGate.take();
        this.gateLanguage = null;
        await this.start({ language, consent: receipt });
      } finally {
        this.gateStarting = false;
      }
    }
    /**
     * Begins a session. Safe to call twice: the machine rejects a second START
     * while a connection is in flight, and this returns without touching the
     * microphone or the network.
     */
    async start(options = {}) {
      if (this.destroyed) return;
      const reason = unavailableReason(this.config);
      if (reason) {
        this.dispatch({ type: "DEMO_UNAVAILABLE", reason });
        return;
      }
      if (!this.dispatch({ type: "START", at: this.now() })) return;
      this.lastTransportPhase = null;
      const attempt = this.context.attempt;
      const stale = () => this.destroyed || this.context.attempt !== attempt || !isActive(this.context.state);
      track("voice_demo_start", { voice_demo_locale: this.locale });
      this.primeAudio();
      const initialLanguage = options.language ? Promise.resolve(options.language) : this.resolveInitialLanguage();
      let microphone;
      try {
        microphone = await this.requestMicrophone();
      } catch (cause) {
        if (stale()) return;
        this.handleMicrophoneError(cause);
        return;
      }
      if (stale()) {
        microphone.getTracks().forEach((t) => t.stop());
        return;
      }
      this.microphone = microphone;
      this.dispatch({ type: "MIC_GRANTED" });
      track("voice_demo_mic_granted");
      this.abortController = new AbortController();
      let session;
      try {
        const resolvedLanguage = await initialLanguage;
        if (stale()) return;
        if (!resolvedLanguage) {
          this.fail("language_unavailable");
          return;
        }
        session = await this.obtainSession(attempt, resolvedLanguage, options.consent);
      } catch (cause) {
        if (stale()) return;
        if (cause instanceof DemoRequestError && cause.code === "consent_policy_outdated") {
          logger.error("consent policy is out of date; a fresh acceptance is required");
          this.consentGate.revoke();
          this.gateLanguage = null;
          this.releaseMicrophone();
          await this.teardownTransport();
          this.clearTimers();
          this.dispatch({ type: "ERROR", code: "consent_policy_outdated" });
          return;
        }
        this.handleRequestError(cause);
        return;
      }
      if (stale() || !session) return;
      this.dispatch({ type: "SESSION_GRANTED", session });
      if (Date.parse(session.expiresAt) <= this.now()) {
        this.fail("session_expired_before_start");
        return;
      }
      try {
        const transport = this.makeTransport(this.transportEvents(attempt));
        this.transport = transport;
        await transport.connect({
          url: session.livekitUrl,
          token: session.token,
          microphone,
          audioElement: this.audioElement,
          // Only the recorded path waits for the agent's capture marker. On the
          // unrecorded demo this is false and the connect sequence is exactly
          // what it has always been — today's agent sends no marker, so arming
          // this unconditionally would break the live demo.
          requireCaptureMarker: options.consent !== void 0
        });
      } catch (cause) {
        if (stale()) return;
        this.lastTransportPhase = cause instanceof TransportError ? cause.phase : "unknown";
        logger.error("transport failed", {
          phase: this.lastTransportPhase,
          cause: cause instanceof TransportError ? cause.causeName : cause == null ? void 0 : cause.name
        });
        this.fail(
          this.lastTransportPhase === "capture_handshake" ? "capture_unavailable" : "transport_failed"
        );
        return;
      }
      if (stale()) {
        this.releaseMicrophone();
        await this.teardownTransport();
        return;
      }
      this.beginCountdown(session.expiresAt);
      track("voice_demo_room_connected", { voice_demo_session: session.sessionId });
    }
    /**
     * Requests a session, satisfying a consent demand if one comes back. At most
     * two round-trips: ask, accept, ask again.
     */
    /**
     * Asks the same-origin function which language to open in.
     *
     * Returns null after two failed attempts. The caller treats null as a
     * blocking error: no session request is made without a canonical language.
     */
    async resolveInitialLanguage() {
      if (this.config.languageOverride) return this.config.languageOverride;
      const url = this.config.languageLookupUrl;
      if (!url) return null;
      for (let attempt = 0; attempt < LANGUAGE_LOOKUP_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.languageLookupTimeoutMs);
        try {
          const response = await fetch(url, {
            method: "GET",
            credentials: "omit",
            cache: "no-store",
            signal: controller.signal
          });
          if (!response.ok) continue;
          const payload = await response.json();
          const value = payload == null ? void 0 : payload.language;
          if (value === "he" || value === "en" || value === "ar") return value;
        } catch {
        } finally {
          clearTimeout(timer);
        }
      }
      return null;
    }
    async obtainSession(attempt, initialLanguage, consent) {
      var _a, _b, _c;
      for (let round = 0; round < 2; round += 1) {
        const turnstileToken = await this.freshTurnstileToken();
        if (this.destroyed || this.context.attempt !== attempt) return null;
        let result;
        try {
          result = await this.client.createSession({
            // Automatic: `this.locale` drives RENDERING only and is never sent.
            // The country-resolved starting language is mandatory. Rendering
            // locale and browser locale remain separate and are never sent.
            language: initialLanguage,
            // Pre-flight acceptance if the gate produced one, otherwise the
            // server-driven v2 path's. Never both, never invented.
            consent: (_a = consent != null ? consent : this.context.acceptedConsent) != null ? _a : void 0,
            turnstileToken,
            signal: (_b = this.abortController) == null ? void 0 : _b.signal
          });
        } finally {
          (_c = this.turnstile) == null ? void 0 : _c.reset();
        }
        if (this.destroyed || this.context.attempt !== attempt) return null;
        if (result.kind === "session") {
          const recording = result.session.recording;
          if ((recording == null ? void 0 : recording.required) && !this.hasAccepted(recording)) {
            const accepted2 = await this.askForConsent(recording, attempt);
            if (!accepted2) return null;
            continue;
          }
          return result.session;
        }
        const accepted = await this.askForConsent(result.consent, attempt);
        if (!accepted) return null;
      }
      this.fail("consent_required");
      return null;
    }
    /**
     * Obtains a Turnstile token, or throws.
     *
     * Returns undefined only when no site key is configured at all — and in that
     * case `unavailableReason` has already refused to start, so an enabled demo
     * can never reach the endpoint unprotected.
     */
    async freshTurnstileToken() {
      var _a, _b, _c;
      const siteKey = this.config.turnstileSiteKey;
      if (!siteKey) return void 0;
      if (!this.turnstile) {
        this.turnstile = (_c = (_b = (_a = this.deps).createTurnstile) == null ? void 0 : _b.call(_a, this.config)) != null ? _c : createTurnstileProvider({ siteKey });
      }
      try {
        return await this.turnstile.getToken();
      } catch (cause) {
        logger.warn("turnstile challenge failed", cause);
        throw new DemoRequestError("verification_failed", "could not obtain a Turnstile token");
      }
    }
    /**
     * Consent is matched on version AND locale: the same policy rendered in a
     * different language is a different thing to have agreed to.
     */
    hasAccepted(consent) {
      const accepted = this.context.acceptedConsent;
      if (!accepted) return false;
      return accepted.policyVersion === consent.policyVersion && accepted.locale === consent.locale;
    }
    /** Renders the server's wording and waits for a decision. */
    async askForConsent(consent, attempt) {
      if (!this.dispatch({ type: "CONSENT_REQUIRED", consent })) return false;
      const accepted = await new Promise((resolve) => {
        this.consentDecision = resolve;
      });
      this.consentDecision = null;
      if (this.destroyed || this.context.attempt !== attempt) return false;
      if (!accepted) {
        track("voice_demo_consent_declined", { voice_demo_policy: consent.policyVersion });
        this.dispatch({ type: "CONSENT_DECLINED" });
        this.releaseMicrophone();
        return false;
      }
      this.dispatch({
        type: "CONSENT_ACCEPTED",
        acceptedAt: new Date(this.now()).toISOString()
      });
      track("voice_demo_consent_accepted", { voice_demo_policy: consent.policyVersion });
      return true;
    }
    transportEvents(attempt) {
      const guard = (fn) => () => {
        if (this.destroyed || this.context.attempt !== attempt) return;
        fn();
      };
      return {
        onConnected: guard(() => {
          this.dispatch({ type: "ROOM_CONNECTED" });
          this.startAgentReadinessTimeout(attempt);
        }),
        onDisconnected: guard(() => {
          if (isActive(this.context.state)) void this.disconnect("remote_disconnected");
        }),
        onReconnecting: guard(() => {
          this.dispatch({ type: "RECONNECTING" });
          this.after(this.config.reconnectTimeoutSeconds * 1e3, () => {
            if (this.context.state === "reconnecting") this.fail("reconnect_failed");
          });
        }),
        onReconnected: guard(() => this.dispatch({ type: "RECONNECTED" })),
        onAgentState: (raw) => guard(() => this.applyAgentState(raw))(),
        onLevel: (level) => {
          if (this.destroyed) return;
          const value = level.toFixed(3);
          this.orb.style.setProperty("--orb-level", value);
          this.root.style.setProperty("--wave-level", value);
        },
        onError: guard(() => this.fail("transport_failed"))
      };
    }
    /**
     * Translates the remote agent's `lk.agent.state` into UI state.
     *
     * The whole point: nothing here reads our own microphone or connection. An
     * unrecognised or absent value is `pending`, never ready — so a future SDK
     * value cannot make the page claim the secretary is listening.
     */
    applyAgentState(raw) {
      const readiness = readinessFor(raw);
      switch (readiness) {
        case "ready":
          this.clearAgentReadinessTimeout();
          this.dispatch({ type: "AGENT_READY" });
          return;
        case "thinking":
          this.clearAgentReadinessTimeout();
          this.dispatch({ type: "AGENT_THINKING" });
          return;
        case "speaking":
          this.clearAgentReadinessTimeout();
          this.dispatch({ type: "AGENT_SPEAKING" });
          return;
        case "lost":
          this.failAgent(this.context.roomConnected && agentIsReady(this.context.state) ? "agent_lost" : "agent_unavailable");
          return;
        case "pending":
          if (raw === null && agentIsReady(this.context.state)) {
            this.failAgent("agent_lost");
            return;
          }
          this.dispatch({ type: "AGENT_PENDING" });
          return;
      }
    }
    /**
     * The agent has this long to appear and report readiness. Without it a
     * visitor sits on "connecting" forever when only the browser joins — which
     * is precisely what happened on the failed staging call.
     */
    startAgentReadinessTimeout(attempt) {
      this.clearAgentReadinessTimeout();
      const ms = this.config.agentReadinessTimeoutSeconds * 1e3;
      this.agentTimeout = setTimeout(() => {
        if (this.destroyed || this.context.attempt !== attempt) return;
        if (agentIsReady(this.context.state)) return;
        this.failAgent("agent_unavailable");
      }, ms);
    }
    clearAgentReadinessTimeout() {
      if (this.agentTimeout !== null) {
        clearTimeout(this.agentTimeout);
        this.agentTimeout = null;
      }
    }
    /** Terminal agent failure: error plus a full teardown of everything held. */
    failAgent(code) {
      if (!isActive(this.context.state)) return;
      this.lastTransportPhase = "agent_readiness";
      logger.error("agent readiness failed", {
        phase: "agent_readiness",
        code,
        session: this.context.lastSessionId
      });
      this.fail(code);
    }
    async requestMicrophone() {
      if (this.deps.requestMicrophone) return this.deps.requestMicrophone();
      return navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    }
    handleMicrophoneError(cause) {
      const name = cause == null ? void 0 : cause.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        track("voice_demo_mic_denied");
        this.dispatch({ type: "MIC_DENIED" });
        return;
      }
      this.dispatch({ type: "MIC_UNAVAILABLE" });
    }
    handleRequestError(cause) {
      if ((cause == null ? void 0 : cause.name) === "AbortError") return;
      if (cause instanceof DemoRequestError) {
        if (cause.code === "rate_limited" || cause.code === "demo_capacity_reached") {
          this.releaseMicrophone();
          this.dispatch({
            type: "RATE_LIMITED",
            scope: rateLimitScopeFor(cause.code),
            retryAfterSeconds: cause.retryAfterSeconds,
            at: this.now()
          });
          track("voice_demo_rate_limited", { voice_demo_code: cause.code });
          return;
        }
        if (cause.code === "demo_disabled" || cause.code === "demo_unavailable") {
          this.releaseMicrophone();
          this.dispatch({ type: "DEMO_UNAVAILABLE", reason: cause.code });
          return;
        }
        this.fail(cause.code);
        return;
      }
      logger.error("session request failed", cause);
      this.fail("server_error");
    }
    fail(code) {
      const sessionId = this.context.lastSessionId;
      this.releaseMicrophone();
      void this.teardownTransport();
      this.clearTimers();
      this.dispatch({ type: "ERROR", code });
      track("voice_demo_error", {
        voice_demo_code: code,
        ...this.lastTransportPhase ? { voice_demo_phase: this.lastTransportPhase } : {},
        // The backend session id is the one identifier support can act on. It is
        // not a credential and carries nothing about the token or the room.
        ...sessionId ? { voice_demo_session: sessionId } : {}
      });
    }
    /** Exposed for QA and tests; not rendered anywhere. */
    get transportPhase() {
      return this.lastTransportPhase;
    }
    /**
     * Ends the session and releases every resource it held.
     *
     * Reachable from four places: the disconnect button, the session deadline,
     * a transport-side drop, and `pagehide`. Because `requestingMicrophone` and
     * `connecting` are active states, it also serves as cancellation — aborting
     * the in-flight request and stopping a microphone that may still be
     * resolving.
     */
    async disconnect(reason) {
      var _a, _b, _c;
      if (!isActive(this.context.state)) return;
      this.clearTimers();
      (_a = this.abortController) == null ? void 0 : _a.abort();
      this.abortController = null;
      (_b = this.turnstile) == null ? void 0 : _b.reset();
      (_c = this.consentDecision) == null ? void 0 : _c.call(this, false);
      this.releaseMicrophone();
      await this.teardownTransport();
      this.dispatch({ type: "DISCONNECT", reason });
      track("voice_demo_finished", { voice_demo_reason: reason });
    }
    beginCountdown(expiresAt) {
      const expiry = Date.parse(expiresAt);
      const cap = this.now() + this.config.maxSessionSeconds * 1e3;
      this.deadline = Number.isFinite(expiry) ? Math.min(expiry, cap) : cap;
      this.tickTimer = setInterval(() => {
        if (!isActive(this.context.state)) return;
        this.render();
      }, 1e3);
      this.after(Math.max(0, this.deadline - this.now()), () => {
        void this.disconnect("session_expired");
      });
    }
    primeAudio() {
      var _a, _b;
      try {
        this.audioElement.muted = false;
        const played = (_b = (_a = this.audioElement).play) == null ? void 0 : _b.call(_a);
        if (played && typeof played.catch === "function") {
          void played.catch(() => void 0);
        }
      } catch {
      }
    }
    releaseMicrophone() {
      var _a;
      (_a = this.microphone) == null ? void 0 : _a.getTracks().forEach((t) => t.stop());
      this.microphone = null;
    }
    async teardownTransport() {
      const transport = this.transport;
      this.transport = null;
      await (transport == null ? void 0 : transport.disconnect());
    }
    after(ms, fn) {
      this.timers.push(setTimeout(fn, ms));
    }
    clearTimers() {
      this.clearAgentReadinessTimeout();
      this.timers.forEach(clearTimeout);
      this.timers = [];
      if (this.tickTimer !== null) {
        clearInterval(this.tickTimer);
        this.tickTimer = null;
      }
      this.deadline = 0;
    }
    // --- Lifecycle ----------------------------------------------------------
    watchLifecycle() {
      window.addEventListener("pagehide", this.onPageHide);
      if (typeof MutationObserver === "function" && this.mount.parentNode) {
        this.mountObserver = new MutationObserver(() => {
          if (!this.mount.isConnected) this.destroy();
        });
        this.mountObserver.observe(document.body, { childList: true, subtree: true });
      }
    }
    /** Idempotent. Releases the microphone, the room, timers and listeners. */
    destroy() {
      var _a, _b, _c, _d;
      if (this.destroyed) return;
      this.destroyed = true;
      this.clearTimers();
      (_a = this.abortController) == null ? void 0 : _a.abort();
      this.abortController = null;
      (_b = this.consentDecision) == null ? void 0 : _b.call(this, false);
      this.consentDecision = null;
      this.releaseMicrophone();
      void this.teardownTransport();
      (_c = this.turnstile) == null ? void 0 : _c.destroy();
      this.turnstile = null;
      window.removeEventListener("pagehide", this.onPageHide);
      (_d = this.mountObserver) == null ? void 0 : _d.disconnect();
      this.mountObserver = null;
      this.root.remove();
    }
    /** Re-renders in a new locale; used when the page's language toggle fires. */
    setLocale(locale) {
      if (locale === this.locale) return;
      this.locale = locale;
      this.strings = stringsFor(locale);
      this.render();
    }
  };

  // src/index.ts
  var MOUNT_SELECTOR = "[data-seenn-voice-demo]";
  function mountAll() {
    const mounts = document.querySelectorAll(MOUNT_SELECTOR);
    mounts.forEach((mount) => {
      if (mount.dataset["svdReady"]) return;
      const config = resolveConfig({ dataset: mount.dataset });
      const blocked = unavailableReason(config);
      if (blocked && !config.renderWhenUnavailable) {
        mount.hidden = true;
        mount.setAttribute("data-svd-state", `hidden:${blocked}`);
        if (blocked === "endpoint_not_configured" && config.publicDemoMode === "enabled") {
          logger.warn(
            "PUBLIC_DEMO_MODE is enabled but no endpoint/anon key is configured \u2014 widget hidden."
          );
        }
        return;
      }
      mount.hidden = false;
      mount.dataset["svdReady"] = "1";
      const widget = new VoiceDemoWidget(mount, config);
      mount.__seennVoiceDemo = widget;
      watchPageLocale(widget, config.locale);
    });
  }
  function watchPageLocale(widget, configured) {
    if (configured || typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(() => {
      const next = resolveLocale(null, document.documentElement.getAttribute("lang"));
      if (isSupported(next)) widget.setLocale(next);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();
