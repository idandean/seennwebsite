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
    "consent_required",
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
    endpointBaseUrl: "",
    anonKey: "",
    endpointPath: "/functions/v1/public-voice-demo",
    turnstileSiteKey: "",
    locale: null,
    livekitModuleUrl: LIVEKIT_MODULE_URL,
    maxSessionSeconds: 120,
    reconnectTimeoutSeconds: 20,
    signupUrl: "https://app.seenn.ai/auth/signup",
    orbSize: 200,
    renderWhenUnavailable: false
  };
  function metaContent(name) {
    var _a, _b;
    return (_b = (_a = document.querySelector(`meta[name="${name}"]`)) == null ? void 0 : _a.getAttribute("content")) != null ? _b : void 0;
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
    unavailableTitle: "The voice demo is not available right now",
    unavailableBody: "It will be back shortly.",
    readyTitle: "Talk to our secretary",
    readyBody: "One click, no signup. She is chasing you over an overdue invoice \u2014 you play the customer.",
    startLabel: "Start the voice demo",
    micTitle: "Allow your microphone",
    micBody: "Your browser is asking for permission. The demo cannot hear you until you allow it.",
    connectingTitle: "Connecting\u2026",
    connectingBody: "Setting up your demo call.",
    listeningTitle: "She is listening",
    listeningBody: "Talk normally \u2014 she will answer you.",
    speakingTitle: "She is speaking",
    speakingBody: "Interrupt her whenever you like.",
    reconnectingTitle: "Reconnecting\u2026",
    reconnectingBody: "The connection dropped. Trying to pick the call back up.",
    finishedTitle: "That was our AI secretary.",
    finishedBody: "She does this for real invoices, on real phone calls, every day \u2014 following your rules.",
    signupCta: "Start free",
    restart: "Talk to her again",
    rateLimitedVisitorTitle: "You have had a few goes already",
    rateLimitedVisitorBody: "Give it a few minutes before trying the demo again.",
    rateLimitedCapacityTitle: "Everyone wants a word with her",
    rateLimitedCapacityBody: "The live demo is at capacity right now. Try again a little later \u2014 or skip the queue and put her to work on your own invoices.",
    errorTitle: "That didn\u2019t connect",
    retry: "Try again",
    disconnect: "End the call",
    timeRemaining: "left",
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
    err_transport_failed: "We couldn\u2019t join the call.",
    err_reconnect_failed: "We lost the connection and couldn\u2019t get it back.",
    err_consent_declined: "No problem \u2014 nothing was recorded.",
    err_session_expired_before_start: "That demo session expired before it started. Try again.",
    err_demo_disabled: "The live demo is switched off at the moment.",
    err_demo_unavailable: "The demo is temporarily unavailable.",
    err_demo_capacity_reached: "The demo is at capacity right now.",
    err_rate_limited: "Too many attempts. Try again shortly.",
    err_verification_failed: "We couldn\u2019t verify your browser. Reload the page and try again.",
    err_consent_required: "The demo needs your agreement before it can start.",
    err_invalid_request: "The demo is misconfigured \u2014 our team has been notified.",
    err_server_error: "Something went wrong on our side."
  };
  var he = {
    unavailableTitle: "\u05D4\u05D3\u05DE\u05D5 \u05D4\u05E7\u05D5\u05DC\u05D9 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05DB\u05E8\u05D2\u05E2",
    unavailableBody: "\u05D4\u05D5\u05D0 \u05D9\u05D7\u05D6\u05D5\u05E8 \u05D1\u05E7\u05E8\u05D5\u05D1.",
    readyTitle: "\u05D3\u05D1\u05E8\u05D5 \u05E2\u05DD \u05D4\u05DE\u05D6\u05DB\u05D9\u05E8\u05D4 \u05E9\u05DC\u05E0\u05D5",
    readyBody: "\u05DC\u05D7\u05D9\u05E6\u05D4 \u05D0\u05D7\u05EA, \u05D1\u05DC\u05D9 \u05D4\u05E8\u05E9\u05DE\u05D4. \u05D4\u05D9\u05D0 \u05E8\u05D5\u05D3\u05E4\u05EA \u05D0\u05D7\u05E8\u05D9\u05DB\u05DD \u05E2\u05DC \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05D1\u05D0\u05D9\u05D7\u05D5\u05E8 \u2014 \u05D0\u05EA\u05DD \u05D4\u05DC\u05E7\u05D5\u05D7.",
    startLabel: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05D0\u05EA \u05D4\u05D3\u05DE\u05D5 \u05D4\u05E7\u05D5\u05DC\u05D9",
    micTitle: "\u05D0\u05E9\u05E8\u05D5 \u05D2\u05D9\u05E9\u05D4 \u05DC\u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF",
    micBody: "\u05D4\u05D3\u05E4\u05D3\u05E4\u05DF \u05DE\u05D1\u05E7\u05E9 \u05D4\u05E8\u05E9\u05D0\u05D4. \u05D1\u05DC\u05D9 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D3\u05DE\u05D5 \u05DC\u05D0 \u05D9\u05D5\u05DB\u05DC \u05DC\u05E9\u05DE\u05D5\u05E2 \u05D0\u05EA\u05DB\u05DD.",
    connectingTitle: "\u05DE\u05EA\u05D7\u05D1\u05E8\u05D9\u05DD\u2026",
    connectingBody: "\u05DE\u05DB\u05D9\u05E0\u05D9\u05DD \u05D0\u05EA \u05E9\u05D9\u05D7\u05EA \u05D4\u05D3\u05DE\u05D5 \u05E9\u05DC\u05DB\u05DD.",
    listeningTitle: "\u05D4\u05D9\u05D0 \u05DE\u05E7\u05E9\u05D9\u05D1\u05D4",
    listeningBody: "\u05D3\u05D1\u05E8\u05D5 \u05E8\u05D2\u05D9\u05DC \u2014 \u05D4\u05D9\u05D0 \u05EA\u05E2\u05E0\u05D4 \u05DC\u05DB\u05DD.",
    speakingTitle: "\u05D4\u05D9\u05D0 \u05DE\u05D3\u05D1\u05E8\u05EA",
    speakingBody: "\u05D0\u05E4\u05E9\u05E8 \u05DC\u05D4\u05E4\u05E8\u05D9\u05E2 \u05DC\u05D4 \u05D1\u05DB\u05DC \u05E8\u05D2\u05E2.",
    reconnectingTitle: "\u05DE\u05EA\u05D7\u05D1\u05E8\u05D9\u05DD \u05DE\u05D7\u05D3\u05E9\u2026",
    reconnectingBody: "\u05D4\u05D7\u05D9\u05D1\u05D5\u05E8 \u05E0\u05D5\u05EA\u05E7. \u05DE\u05E0\u05E1\u05D9\u05DD \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05D0\u05EA \u05D4\u05E9\u05D9\u05D7\u05D4.",
    finishedTitle: "\u05D6\u05D5 \u05D4\u05D9\u05D9\u05EA\u05D4 \u05D4\u05DE\u05D6\u05DB\u05D9\u05E8\u05D4 \u05D4\u05D7\u05DB\u05DE\u05D4 \u05E9\u05DC\u05E0\u05D5.",
    finishedBody: "\u05D4\u05D9\u05D0 \u05E2\u05D5\u05E9\u05D4 \u05D0\u05EA \u05D6\u05D4 \u05E2\u05DC \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05D0\u05DE\u05D9\u05EA\u05D9\u05D5\u05EA, \u05D1\u05E9\u05D9\u05D7\u05D5\u05EA \u05D0\u05DE\u05D9\u05EA\u05D9\u05D5\u05EA, \u05DB\u05DC \u05D9\u05D5\u05DD \u2014 \u05DC\u05E4\u05D9 \u05D4\u05DB\u05DC\u05DC\u05D9\u05DD \u05E9\u05DC\u05DB\u05DD.",
    signupCta: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05D1\u05D7\u05D9\u05E0\u05DD",
    restart: "\u05D3\u05D1\u05E8\u05D5 \u05D0\u05D9\u05EA\u05D4 \u05E9\u05D5\u05D1",
    rateLimitedVisitorTitle: "\u05DB\u05D1\u05E8 \u05E0\u05D9\u05E1\u05D9\u05EA\u05DD \u05DB\u05DE\u05D4 \u05E4\u05E2\u05DE\u05D9\u05DD",
    rateLimitedVisitorBody: "\u05D4\u05DE\u05EA\u05D9\u05E0\u05D5 \u05DB\u05DE\u05D4 \u05D3\u05E7\u05D5\u05EA \u05DC\u05E4\u05E0\u05D9 \u05E0\u05D9\u05E1\u05D9\u05D5\u05DF \u05E0\u05D5\u05E1\u05E3.",
    rateLimitedCapacityTitle: "\u05DB\u05D5\u05DC\u05DD \u05E8\u05D5\u05E6\u05D9\u05DD \u05DC\u05D3\u05D1\u05E8 \u05D0\u05D9\u05EA\u05D4",
    rateLimitedCapacityBody: "\u05D4\u05D3\u05DE\u05D5 \u05D4\u05D7\u05D9 \u05D1\u05EA\u05E4\u05D5\u05E1\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05DB\u05E8\u05D2\u05E2. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05E2\u05D5\u05D3 \u05E7\u05E6\u05EA \u2014 \u05D0\u05D5 \u05D3\u05DC\u05D2\u05D5 \u05E2\u05DC \u05D4\u05EA\u05D5\u05E8 \u05D5\u05EA\u05E0\u05D5 \u05DC\u05D4 \u05DC\u05D8\u05E4\u05DC \u05D1\u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD.",
    errorTitle: "\u05D4\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05E0\u05DB\u05E9\u05DC\u05D4",
    retry: "\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1",
    disconnect: "\u05E1\u05D9\u05D5\u05DD \u05D4\u05E9\u05D9\u05D7\u05D4",
    timeRemaining: "\u05E0\u05D5\u05EA\u05E8\u05D5",
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
    err_transport_failed: "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D4\u05E6\u05D8\u05E8\u05E3 \u05DC\u05E9\u05D9\u05D7\u05D4.",
    err_reconnect_failed: "\u05D4\u05D7\u05D9\u05D1\u05D5\u05E8 \u05E0\u05D5\u05EA\u05E7 \u05D5\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05E9\u05D7\u05D6\u05E8 \u05D0\u05D5\u05EA\u05D5.",
    err_consent_declined: "\u05D0\u05D9\u05DF \u05D1\u05E2\u05D9\u05D4 \u2014 \u05E9\u05D5\u05DD \u05D3\u05D1\u05E8 \u05DC\u05D0 \u05D4\u05D5\u05E7\u05DC\u05D8.",
    err_session_expired_before_start: "\u05EA\u05D5\u05E7\u05E3 \u05D4\u05D3\u05DE\u05D5 \u05E4\u05D2 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D4\u05EA\u05D7\u05D9\u05DC. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    err_demo_disabled: "\u05D4\u05D3\u05DE\u05D5 \u05D4\u05D7\u05D9 \u05DB\u05D1\u05D5\u05D9 \u05DB\u05E8\u05D2\u05E2.",
    err_demo_unavailable: "\u05D4\u05D3\u05DE\u05D5 \u05D0\u05D9\u05E0\u05D5 \u05D6\u05DE\u05D9\u05DF \u05D6\u05DE\u05E0\u05D9\u05EA.",
    err_demo_capacity_reached: "\u05D4\u05D3\u05DE\u05D5 \u05D1\u05EA\u05E4\u05D5\u05E1\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05DB\u05E8\u05D2\u05E2.",
    err_rate_limited: "\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u05E0\u05D9\u05E1\u05D9\u05D5\u05E0\u05D5\u05EA. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E7\u05E8\u05D5\u05D1.",
    err_verification_failed: "\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D0\u05DE\u05EA \u05D0\u05EA \u05D4\u05D3\u05E4\u05D3\u05E4\u05DF. \u05E8\u05E2\u05E0\u05E0\u05D5 \u05D0\u05EA \u05D4\u05D3\u05E3 \u05D5\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    err_consent_required: "\u05D4\u05D3\u05DE\u05D5 \u05D6\u05E7\u05D5\u05E7 \u05DC\u05D4\u05E1\u05DB\u05DE\u05EA\u05DB\u05DD \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D9\u05D5\u05DB\u05DC \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC.",
    err_invalid_request: "\u05EA\u05E6\u05D5\u05E8\u05EA \u05D4\u05D3\u05DE\u05D5 \u05E9\u05D2\u05D5\u05D9\u05D4 \u2014 \u05D4\u05E6\u05D5\u05D5\u05EA \u05E9\u05DC\u05E0\u05D5 \u05E2\u05D5\u05D3\u05DB\u05DF.",
    err_server_error: "\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9 \u05D0\u05E6\u05DC\u05E0\u05D5."
  };
  var ar = {
    unavailableTitle: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u062A\u064A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u062D\u0627\u0644\u064A\u064B\u0627",
    unavailableBody: "\u0633\u064A\u0639\u0648\u062F \u0642\u0631\u064A\u0628\u064B\u0627.",
    readyTitle: "\u062A\u062D\u062F\u0651\u062B \u0625\u0644\u0649 \u0633\u0643\u0631\u062A\u064A\u0631\u062A\u0646\u0627",
    readyBody: "\u0646\u0642\u0631\u0629 \u0648\u0627\u062D\u062F\u0629\u060C \u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644. \u0647\u064A \u062A\u0637\u0627\u0631\u062F\u0643 \u0628\u0634\u0623\u0646 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u062A\u0623\u062E\u0631\u0629 \u2014 \u0648\u0623\u0646\u062A \u0627\u0644\u0639\u0645\u064A\u0644.",
    startLabel: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u062A\u064A",
    micTitle: "\u0627\u0633\u0645\u062D \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646",
    micBody: "\u064A\u0637\u0644\u0628 \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0627\u0644\u0625\u0630\u0646. \u0644\u0646 \u064A\u062A\u0645\u0643\u0646 \u0627\u0644\u0639\u0631\u0636 \u0645\u0646 \u0633\u0645\u0627\u0639\u0643 \u0642\u0628\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629.",
    connectingTitle: "\u062C\u0627\u0631\u064D \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u2026",
    connectingBody: "\u0646\u064F\u062C\u0647\u0651\u0632 \u0645\u0643\u0627\u0644\u0645\u0629 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0643.",
    listeningTitle: "\u0647\u064A \u062A\u0633\u062A\u0645\u0639",
    listeningBody: "\u062A\u062D\u062F\u0651\u062B \u0628\u0634\u0643\u0644 \u0637\u0628\u064A\u0639\u064A \u2014 \u0633\u062A\u0631\u062F\u0651 \u0639\u0644\u064A\u0643.",
    speakingTitle: "\u0647\u064A \u062A\u062A\u062D\u062F\u062B",
    speakingBody: "\u064A\u0645\u0643\u0646\u0643 \u0645\u0642\u0627\u0637\u0639\u062A\u0647\u0627 \u0641\u064A \u0623\u064A \u0648\u0642\u062A.",
    reconnectingTitle: "\u062C\u0627\u0631\u064D \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644\u2026",
    reconnectingBody: "\u0627\u0646\u0642\u0637\u0639 \u0627\u0644\u0627\u062A\u0635\u0627\u0644. \u0646\u062D\u0627\u0648\u0644 \u0627\u0633\u062A\u0626\u0646\u0627\u0641 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629.",
    finishedTitle: "\u062A\u0644\u0643 \u0643\u0627\u0646\u062A \u0633\u0643\u0631\u062A\u064A\u0631\u062A\u0646\u0627 \u0627\u0644\u0630\u0643\u064A\u0629.",
    finishedBody: "\u062A\u0641\u0639\u0644 \u0630\u0644\u0643 \u0645\u0639 \u0641\u0648\u0627\u062A\u064A\u0631 \u062D\u0642\u064A\u0642\u064A\u0629\u060C \u0641\u064A \u0645\u0643\u0627\u0644\u0645\u0627\u062A \u062D\u0642\u064A\u0642\u064A\u0629\u060C \u0643\u0644 \u064A\u0648\u0645 \u2014 \u0648\u0641\u0642 \u0642\u0648\u0627\u0639\u062F\u0643.",
    signupCta: "\u0627\u0628\u062F\u0623 \u0645\u062C\u0627\u0646\u064B\u0627",
    restart: "\u062A\u062D\u062F\u0651\u062B \u0625\u0644\u064A\u0647\u0627 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649",
    rateLimitedVisitorTitle: "\u0644\u0642\u062F \u062C\u0631\u0651\u0628\u062A \u0639\u062F\u0629 \u0645\u0631\u0627\u062A \u0628\u0627\u0644\u0641\u0639\u0644",
    rateLimitedVisitorBody: "\u0627\u0646\u062A\u0638\u0631 \u0628\u0636\u0639 \u062F\u0642\u0627\u0626\u0642 \u0642\u0628\u0644 \u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0639\u0631\u0636 \u0645\u062C\u062F\u062F\u064B\u0627.",
    rateLimitedCapacityTitle: "\u0627\u0644\u062C\u0645\u064A\u0639 \u064A\u0631\u064A\u062F \u0627\u0644\u062A\u062D\u062F\u062B \u0625\u0644\u064A\u0647\u0627",
    rateLimitedCapacityBody: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0645\u0645\u062A\u0644\u0626 \u062D\u0627\u0644\u064A\u064B\u0627. \u062D\u0627\u0648\u0644 \u0644\u0627\u062D\u0642\u064B\u0627 \u2014 \u0623\u0648 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0637\u0627\u0628\u0648\u0631 \u0648\u062F\u0639\u0647\u0627 \u062A\u0639\u0645\u0644 \u0639\u0644\u0649 \u0641\u0648\u0627\u062A\u064A\u0631\u0643.",
    errorTitle: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644",
    retry: "\u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649",
    disconnect: "\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629",
    timeRemaining: "\u0645\u062A\u0628\u0642\u064D",
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
    err_transport_failed: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629.",
    err_reconnect_failed: "\u0641\u0642\u062F\u0646\u0627 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0648\u0644\u0645 \u0646\u062A\u0645\u0643\u0646 \u0645\u0646 \u0627\u0633\u062A\u0639\u0627\u062F\u062A\u0647.",
    err_consent_declined: "\u0644\u0627 \u0645\u0634\u0643\u0644\u0629 \u2014 \u0644\u0645 \u064A\u064F\u0633\u062C\u064E\u0651\u0644 \u0623\u064A \u0634\u064A\u0621.",
    err_session_expired_before_start: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u062C\u0644\u0633\u0629 \u0627\u0644\u0639\u0631\u0636 \u0642\u0628\u0644 \u0623\u0646 \u062A\u0628\u062F\u0623. \u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u064B\u0627.",
    err_demo_disabled: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0645\u062A\u0648\u0642\u0641 \u062D\u0627\u0644\u064A\u064B\u0627.",
    err_demo_unavailable: "\u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0645\u0624\u0642\u062A\u064B\u0627.",
    err_demo_capacity_reached: "\u0627\u0644\u0639\u0631\u0636 \u0645\u0645\u062A\u0644\u0626 \u062D\u0627\u0644\u064A\u064B\u0627.",
    err_rate_limited: "\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u064B\u0627. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0642\u0631\u064A\u0628\u064B\u0627.",
    err_verification_failed: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0645\u062A\u0635\u0641\u062D\u0643. \u0623\u0639\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0641\u062D\u0629 \u0648\u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u064B\u0627.",
    err_consent_required: "\u064A\u062D\u062A\u0627\u062C \u0627\u0644\u0639\u0631\u0636 \u0625\u0644\u0649 \u0645\u0648\u0627\u0641\u0642\u062A\u0643 \u0642\u0628\u0644 \u0623\u0646 \u064A\u0628\u062F\u0623.",
    err_invalid_request: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629 \u2014 \u062A\u0645 \u0625\u0628\u0644\u0627\u063A \u0641\u0631\u064A\u0642\u0646\u0627.",
    err_server_error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0644\u062F\u064A\u0646\u0627."
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
      const turnstileToken = (_b = (_a = input.turnstileToken) == null ? void 0 : _a.trim()) != null ? _b : "";
      if (this.options.requireTurnstileToken && !turnstileToken) {
        throw new DemoRequestError(
          "verification_failed",
          "refusing to send a session request without a Turnstile token"
        );
      }
      const body = { language: input.locale };
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
        return { kind: "session", session: normalizeSession(payload, { now: this.now() }) };
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

  // src/transport.ts
  function smooth(previous, next) {
    return next > previous ? next : previous + (next - previous) * 0.25;
  }
  function createLiveKitTransport(events, options) {
    var _a;
    let room = null;
    let rafId = 0;
    let level = 0;
    let speaking = false;
    let disposed = false;
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
        const nowSpeaking = speaking ? level > 0.06 : level > 0.14;
        if (nowSpeaking !== speaking) {
          speaking = nowSpeaking;
          events.onAssistantSpeaking(speaking);
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }
    return {
      async connect({ url, token, microphone, audioElement }) {
        var _a2, _b, _c, _d, _e, _f;
        const lk = await load(options.moduleUrl).catch((cause) => {
          var _a3;
          logger.error("failed to load the audio engine", { module: safeUrl(options.moduleUrl) });
          throw new Error(`livekit module load failed: ${(_a3 = cause == null ? void 0 : cause.name) != null ? _a3 : "unknown"}`);
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
        instance.on((_b = lk.RoomEvent["Reconnecting"]) != null ? _b : "reconnecting", () => events.onReconnecting());
        instance.on((_c = lk.RoomEvent["Reconnected"]) != null ? _c : "reconnected", () => events.onReconnected());
        instance.on((_d = lk.RoomEvent["Disconnected"]) != null ? _d : "disconnected", () => events.onDisconnected());
        try {
          await instance.connect(url, token);
          const audioTrack = microphone.getAudioTracks()[0];
          if (audioTrack && typeof lk.LocalAudioTrack === "function") {
            await instance.localParticipant.publishTrack(new lk.LocalAudioTrack(audioTrack));
          } else {
            await instance.localParticipant.setMicrophoneEnabled(true);
          }
          await ((_e = instance.startAudio) == null ? void 0 : _e.call(instance).catch(() => void 0));
        } catch (cause) {
          throw new Error(`livekit connect failed: ${(_f = cause == null ? void 0 : cause.name) != null ? _f : "unknown"}`);
        }
        startMetering(lk);
        events.onConnected();
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
    "assistantSpeaking",
    "reconnecting"
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
      retryAfterUntil: null
    };
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
        return { ...context, session: event.session };
      case "CONNECTED":
        if (state !== "connecting") return context;
        return { ...context, state: "listening" };
      case "ASSISTANT_SPEAKING_START":
        if (state !== "listening") return context;
        return { ...context, state: "assistantSpeaking" };
      case "ASSISTANT_SPEAKING_END":
        if (state !== "assistantSpeaking") return context;
        return { ...context, state: "listening" };
      case "RECONNECTING":
        if (state !== "listening" && state !== "assistantSpeaking") return context;
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
    blocked: '<path d="M4.9 4.9 19.1 19.1"/><circle cx="12" cy="12" r="9"/>'
  };
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
      this.timers = [];
      this.tickTimer = null;
      this.deadline = 0;
      this.destroyed = false;
      this.onPageHide = () => {
        void this.disconnect("page_hidden");
      };
      this.mountObserver = null;
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
    // --- DOM ----------------------------------------------------------------
    build() {
      const root = document.createElement("div");
      root.className = "svd";
      root.setAttribute("dir", directionFor(this.locale));
      root.lang = this.locale;
      const size = this.config.orbSize;
      root.innerHTML = `
      <div class="svd__stage">
        <div class="preview-orb" style="width:${size}px;height:${size}px">
          <span class="preview-orb__glow" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--a" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--b" aria-hidden="true"></span>
          <span class="preview-orb__layer preview-orb__layer--c" aria-hidden="true"></span>
          <span class="preview-orb__wisp" aria-hidden="true"></span>
          <span class="preview-orb__rim" aria-hidden="true"></span>
          <span class="svd__ripples" aria-hidden="true"></span>
          <span class="svd__level" aria-hidden="true"></span>
          <button type="button" class="preview-orb__call"></button>
        </div>
      </div>
      <p class="svd__headline"></p>
      <p class="svd__sub"></p>
      <p class="svd__hint"></p>
      <div class="svd__consent" role="group" hidden>
        <p class="svd__consent-heading"></p>
        <p class="svd__consent-text"></p>
        <a class="svd__consent-link" target="_blank" rel="noopener noreferrer" hidden></a>
        <div class="svd__consent-actions">
          <button type="button" class="svd__consent-accept"></button>
          <button type="button" class="svd__consent-decline"></button>
        </div>
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
      this.consentPanel = q(".svd__consent");
      this.consentText = q(".svd__consent-text");
      this.consentLink = q(".svd__consent-link");
      this.consentAccept = q(".svd__consent-accept");
      this.consentDecline = q(".svd__consent-decline");
      this.ctaWrap = q(".svd__cta");
      this.ctaLink = q(".svd__cta-button");
      this.audioElement = q(".svd__audio");
      this.liveRegion = q(".svd__sr-only");
      this.audioElement.autoplay = true;
      this.primaryButton.addEventListener("click", () => {
        void this.onPrimaryAction();
      });
      this.disconnectButton.addEventListener("click", () => {
        void this.disconnect("user_disconnected");
      });
      this.consentAccept.addEventListener("click", () => {
        var _a;
        return (_a = this.consentDecision) == null ? void 0 : _a.call(this, true);
      });
      this.consentDecline.addEventListener("click", () => {
        var _a;
        return (_a = this.consentDecision) == null ? void 0 : _a.call(this, false);
      });
      this.ctaLink.addEventListener("click", () => {
        track("voice_demo_cta_click", { voice_demo_state: this.context.state });
      });
      this.mount.appendChild(root);
    }
    dispatch(event) {
      const next = reduce(this.context, event);
      if (next === this.context) return false;
      this.context = next;
      this.render();
      return true;
    }
    render() {
      var _a;
      if (this.destroyed) return;
      const { state, pendingConsent } = this.context;
      const s = this.strings;
      this.root.setAttribute("data-state", state);
      this.root.setAttribute("dir", directionFor(this.locale));
      this.root.lang = this.locale;
      this.root.classList.toggle("svd--consent", pendingConsent !== null);
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
        case "assistantSpeaking":
          return { title: s.speakingTitle, body: `${s.speakingBody} ${this.remainingLabel()}` };
        case "reconnecting":
          return { title: s.reconnectingTitle, body: s.reconnectingBody };
        case "finished":
          return { title: s.finishedTitle, body: s.finishedBody };
        case "rateLimited":
          return rateLimitScope === "global_capacity" ? { title: s.rateLimitedCapacityTitle, body: s.rateLimitedCapacityBody } : { title: s.rateLimitedVisitorTitle, body: s.rateLimitedVisitorBody };
        case "error": {
          const key = `err_${errorCode != null ? errorCode : "server_error"}`;
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
      await this.start();
    }
    /**
     * Begins a session. Safe to call twice: the machine rejects a second START
     * while a connection is in flight, and this returns without touching the
     * microphone or the network.
     */
    async start() {
      if (this.destroyed) return;
      const reason = unavailableReason(this.config);
      if (reason) {
        this.dispatch({ type: "DEMO_UNAVAILABLE", reason });
        return;
      }
      if (!this.dispatch({ type: "START", at: this.now() })) return;
      const attempt = this.context.attempt;
      const stale = () => this.destroyed || this.context.attempt !== attempt || !isActive(this.context.state);
      track("voice_demo_start", { voice_demo_locale: this.locale });
      this.primeAudio();
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
        session = await this.obtainSession(attempt);
      } catch (cause) {
        if (stale()) return;
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
          audioElement: this.audioElement
        });
      } catch (cause) {
        if (stale()) return;
        logger.error("transport failed", cause);
        this.fail("transport_failed");
        return;
      }
      if (stale()) {
        this.releaseMicrophone();
        await this.teardownTransport();
        return;
      }
      this.beginCountdown(session.expiresAt);
      this.dispatch({ type: "CONNECTED" });
      track("voice_demo_connected", { voice_demo_session: session.sessionId });
    }
    /**
     * Requests a session, satisfying a consent demand if one comes back. At most
     * two round-trips: ask, accept, ask again.
     */
    async obtainSession(attempt) {
      var _a, _b, _c;
      for (let round = 0; round < 2; round += 1) {
        const turnstileToken = await this.freshTurnstileToken();
        if (this.destroyed || this.context.attempt !== attempt) return null;
        let result;
        try {
          result = await this.client.createSession({
            locale: this.locale,
            consent: (_a = this.context.acceptedConsent) != null ? _a : void 0,
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
        onConnected: guard(() => void 0),
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
        onAssistantSpeaking: (speaking) => guard(
          () => this.dispatch({
            type: speaking ? "ASSISTANT_SPEAKING_START" : "ASSISTANT_SPEAKING_END"
          })
        )(),
        onLevel: (level) => {
          if (this.destroyed) return;
          this.orb.style.setProperty("--orb-level", level.toFixed(3));
        },
        onError: guard(() => this.fail("transport_failed"))
      };
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
      this.releaseMicrophone();
      void this.teardownTransport();
      this.clearTimers();
      this.dispatch({ type: "ERROR", code });
      track("voice_demo_error", { voice_demo_code: code });
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
