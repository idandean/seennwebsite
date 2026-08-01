# `public-voice-demo` — what the frontend needs

Status: **proposed, not agreed.** This document states what the website widget
requires in order to work. It is not a decision about the endpoint's design —
where a choice is genuinely open, it says so and lists the options the client
already handles.

The frontend is built and tested against this. `src/contract.ts` is the single
place the wire format is read, so if the backend lands on different names, that
one file changes.

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
| `consent` | object, below | only after the visitor accepted a consent notice |
| `turnstile_token` | string | only once a Turnstile site key is configured |

```jsonc
{
  "language": "he",
  "consent": {                       // omitted unless previously demanded
    "policy_version": "rec-2026-02",
    "locale": "he",
    "accepted_at": "2026-08-01T10:00:00.000Z"
  }
}
```

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

Only relevant **if the session is recorded.** If it is not, omit the block
entirely and nothing below applies.

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

### ⚠️ Backend decision required

The widget handles **both** of these; the backend must pick one and say which:

- **(a) Consent as a rejection.** Respond `4xx` with `error: "consent_required"`
  plus the `recording` block, and no token. The widget shows the notice, then
  retries the same request with `consent` populated.
- **(b) Consent inside a normal response.** Respond `200` with the `recording`
  block and **no token**. Same visitor-facing flow.

What must *not* happen is a `200` that carries **both** a usable token and
`recording.required: true` on the first call: the widget would then hold a
joinable session for a recorded call the visitor has not yet agreed to. It
currently does not auto-connect in that case, but the situation is ambiguous and
should be designed out rather than handled.

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

## 6. Still open (product, not engineering)

1. **Is the demo recorded at all?** Everything in §3 is dead code if not.
2. **Consent shape** — (a) or (b) in §3.
3. **Which Supabase project** the website points at for staging vs production.
   Both `endpointBaseUrl` and `anonKey` currently ship empty.
4. **Arabic.** The widget speaks it, but the site has no `/ar/` pages, so no
   visitor can currently reach an Arabic page. Does the demo need to offer
   Arabic before the site does?
5. **Rate-limit code split** — see §4.
