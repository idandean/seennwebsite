# `public-voice-demo` — what the frontend needs

Status: **request side frozen, response side proposed.**

Six product decisions are now frozen and implemented (§0). The response shape
is still the backend's call; where a choice is open this document says so and
lists what the client already handles.

The frontend is built and tested against this. `src/contract.ts` is the single
place the wire format is read, so if the backend lands on different names, that
one file changes.

---

## 0. Frozen decisions (v1)

1. **The website demo is NOT recorded.** No consent is required. The consent
   machinery in the client is retained for a possible v2 and is fail-closed:
   any response demanding recording is rejected, not accommodated.
2. The frontend sends **no `amount` and no `balance_month`**. The backend
   supplies its own demo-invoice defaults.
3. Request body is exactly `{ "language", "turnstile_token" }`.
4. `apikey` header with a Supabase anon/publishable key. **No Authorization
   header.**
5. A successful response must carry `token`, `livekit_url`, `session_id`,
   `expires_at`, `language`. Aliases remain supported.
6. `destination_phone` and `tenant_id` are never sent.

---

## 1. Endpoint

```
POST {SUPABASE_URL}/functions/v1/public-voice-demo
Content-Type: application/json
apikey: {SUPABASE_ANON_KEY}
```

- Callers are **anonymous visitors**. There is no user JWT, and the widget sends
  no `Authorization` header.
- This must **not** be the authenticated `ar-preview-call` endpoint, and must not
  share its ability to dial a phone number.
- The browser only ever holds the **anon** key. The widget actively refuses to
  start if the configured key decodes to `role: service_role` or matches a
  LiveKit API-secret pattern (`src/contract.ts` → `looksLikeServerSecret`).

### Request body

The widget sends only these fields, built from a literal — there is no
pass-through of caller-supplied keys:

| Field | Type | When |
|---|---|---|
| `language` | `"en" \| "he" \| "ar"` | always — the website's current locale |
| `turnstile_token` | string | always, once a site key is configured |

```jsonc
{
  "language": "he",
  "turnstile_token": "0.abc123..."
}
```

**Turnstile is mandatory.** The token is fresh and single-use: obtained
immediately before each POST and discarded afterwards, on success and failure
alike. The backend must verify it against the Cloudflare siteverify API with
the matching **secret** key, and must reject a request without one.

**The widget renders the challenge with `action: "public_voice_demo"`.**
Cloudflare echoes this back in the siteverify response, and the backend must
check it:

```jsonc
// POST https://challenges.cloudflare.com/turnstile/v0/siteverify
{
  "success": true,
  "action": "public_voice_demo",   // <-- must equal this exact string
  "hostname": "www.seenn.ai",
  "challenge_ts": "..."
}
```

Without that check, a token minted by any other Turnstile widget on any other
Seenn page would be accepted here. The string is defined once, as
`TURNSTILE_ACTION` in `src/turnstile.ts`, and pinned by regression tests —
changing it on either side alone breaks verification.

When the demo is enabled but any of the endpoint URL, anon key or Turnstile
site key is missing, the widget refuses to start rather than posting
unprotected. There is no code path that sends a session request without a
configured token.

**UNCONFIRMED:** snake_case is assumed for request fields, matching the other
Supabase functions in this stack. Confirm or correct.

---

## 2. Success response — required fields

All five are **required**. The widget refuses the session and reports
`contract_violation` if any is missing, naming the ones it could not find.

| Field | Type | Why the widget needs it |
|---|---|---|
| `token` | string | Short-lived **LiveKit participant token**. Never an API key or secret. |
| `livekit_url` | string | `wss://…` server URL to connect to. |
| `session_id` | string | Room/session identifier, for support correlation and logs. |
| `expires_at` | string | ISO-8601 absolute expiry. Drives the countdown and the hard client-side cut-off. |
| `language` | string | The locale the backend actually **resolved** for the agent, which may differ from the requested one. |

### Values are validated, not just presence

The client rejects a structurally-complete response whose values it cannot use.
A token it cannot use is worse than no token: it produces a connected UI
attached to nothing.

| Rule | Why |
|---|---|
| `livekit_url` must be **`wss://`** | `ws://` puts the participant token on the wire in clear. `http/https/ws` are all rejected. |
| `expires_at` must parse **and be in the future** | A past expiry is a session that dies on arrival. |
| `language` must canonicalise to **en, he or ar** | A session in a language the widget cannot render. `he-IL`, `iw`, `ar-EG` are accepted and folded; anything else is rejected. |
| `token` and `session_id` must be **non-empty** | Whitespace-only counts as empty. |
| A usable token **must not** arrive with `recording.required=true` | v1 is not recorded; this would be a recorded call the visitor never agreed to. |

All failures surface as `contract_violation`, listing every problem found
rather than only the first.

```jsonc
{
  "token": "<LiveKit participant JWT>",
  "livekit_url": "wss://seenn-staging.livekit.cloud",
  "session_id": "demo-9f3c…",
  "expires_at": "2026-08-01T10:05:00Z",
  "language": "he"
}
```

### Token requirements

- Scoped to **one room**, with join + publish + subscribe for that room only.
- TTL short — minutes, not hours. The widget also caps the session client-side
  (`maxSessionSeconds`, default 120s) and disconnects at whichever comes first.
- It must not grant room-creation, recording control, or admin permissions.

### Accepted aliases (temporary)

Because the contract is unagreed, the client also accepts these spellings. Once
the real shape lands, **cut each list to one** and delete the rest:

| Canonical | Also accepted |
|---|---|
| `token` | `participant_token`, `access_token`, `accessToken`, `participantToken` |
| `livekit_url` | `livekitUrl`, `url`, `ws_url`, `wsUrl`, `server_url` |
| `session_id` | `sessionId`, `room_name`, `roomName`, `room`, `preview_session_id` |
| `expires_at` | `expiresAt`, `expiry`, `expires` |
| `language` | `resolved_language`, `resolvedLanguage`, `locale` |

---

## 3. Recording consent

**v1 answer: the website demo is NOT recorded. Omit this block entirely.**

Everything below applies only to a possible v2. The client keeps the machinery
but treats it as fail-closed — see the rejection rules at the end.

The widget renders the server's wording **verbatim** and ships no consent copy
of its own in any locale — consent text is a legal artefact and belongs with
whoever versions it. A consent block missing either `text` or `policy_version`
is treated as unusable and discarded, because the widget will not invent
wording and cannot record an acceptance it cannot identify.

```jsonc
{
  "recording": {
    "required": true,
    "text": "This call is recorded so we can improve the demo…",
    "policy_version": "rec-2026-02",
    "locale": "he",
    "policy_url": "https://www.seenn.ai/privacy-policy.html"   // optional
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `required` | boolean | Defaults to `false` if absent — the widget will not assume consent is needed. |
| `text` | string | **Already localised by the server.** Rendered as plain text; newlines preserved. |
| `policy_version` | string | Opaque. Echoed back in the request's `consent.policy_version`. |
| `locale` | string | The locale `text` was actually rendered in. Echoed back. |
| `policy_url` | string | Optional link to the full policy. |

### If v2 ever records

The widget handles **both** of these; the backend would pick one:

- **(a) Consent as a rejection.** Respond `4xx` with `error: "consent_required"`
  plus the `recording` block, and no token. The widget shows the notice, then
  retries the same request with `consent` populated.
- **(b) Consent inside a normal response.** Respond `200` with the `recording`
  block and **no token**. Same visitor-facing flow.

**Fail-closed rules now enforced by the client:**

- A response with a usable token **and** `recording.required=true` is rejected
  as `contract_violation`. It is not reconciled, and never auto-connects.
- A `required` recording block missing `text` or `policy_version` is rejected,
  rather than silently dropped — we will not invent consent wording, and we
  cannot record an acceptance we cannot identify.
- `policy_url` must be `http://` or `https://`. Anything else makes the block
  malformed.
- A stored acceptance is matched on **both policy version and locale**. The
  same policy rendered in a different language is a different thing to have
  agreed to.

---

## 4. Error responses

The widget reads the code from `error`, `code`, `error_code` or `type` (an
RFC 7807 URI has its last path segment taken). Anything unrecognised falls back
to the HTTP status class, so a new code degrades to a generic message rather
than a blank panel.

| Code | Status | Widget behaviour |
|---|---|---|
| `demo_disabled` | 503 | → `unavailable`. Expected until `PUBLIC_DEMO_MODE=enabled` server-side. |
| `demo_unavailable` | 503 | → `unavailable` |
| `demo_capacity_reached` | 429 | → `rateLimited`, framed as popularity, with the signup CTA |
| `rate_limited` | 429 | → `rateLimited`, framed as "you've had a few goes" |
| `verification_failed` | 403 | → `error`, asks the visitor to reload |
| `consent_required` | 4xx | → consent panel (see §3) |
| `invalid_request` | 4xx | → `error`, worded as our misconfiguration |
| `server_error` | 5xx | → `error`, generic |

`Retry-After` is read when present on a 429.

**UNCONFIRMED:** whether per-IP rate limiting and the global daily cap use
distinct codes. The widget renders them differently and currently distinguishes
them by `rate_limited` vs `demo_capacity_reached`.

---

## 5. What the backend must guarantee

- **No secrets to the browser.** Participant token only; never a LiveKit API
  key/secret or a Supabase service-role key.
- **The agent joins the room.** The widget connects and waits. If the agent's
  browser-mode branch does not join, the visitor gets a connected state and
  silence — the failure mode that made the previous iteration mock-only.
- **Server-side caps.** Per-IP rate limiting and a global daily ceiling; the
  client-side session cap is a courtesy, not a control.
- **Bot protection** if the demo costs real money per session. The widget will
  send `turnstile_token` once a site key is configured.

---

## 6. Still open

1. **Which Supabase project** the website points at, staging vs production.
   `endpointBaseUrl`, `anonKey` and `turnstileSiteKey` all ship empty.
2. **Rate-limit code split** — see §4. The client renders per-visitor and
   global-capacity limits differently and honours `Retry-After` by refusing to
   start again until the window has passed.
3. **Arabic.** The widget speaks it, but the site has no `/ar/` pages, so no
   visitor can currently reach one. Does the demo offer Arabic before the site
   does?

Resolved since the last revision: recording (no), `amount`/`balance_month`
(backend defaults), request body, auth header, Turnstile (mandatory).
