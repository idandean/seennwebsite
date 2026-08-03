# Configuring the public voice demo

**Nothing in this document is committed anywhere in this repository.** The
checked-in defaults are disabled and empty, and must stay that way until the
backend endpoint exists. This file describes how a future deploy would be
configured; it is not a description of the current state.

---

## 1. This repository does not receive environment variables

Worth being blunt about, because it is the opposite of how the dashboard app
works.

`seennwebsite` is a **static site**. There is no `package.json` at the
repository root, no build step, and no framework. Vercel serves the HTML, CSS
and JS files exactly as they are committed.

That means:

- **Vercel environment variables never reach this code.** Setting
  `PUBLIC_DEMO_MODE` in the Vercel dashboard does nothing. There is no build
  that could read it and nothing that could inline it.
- There is deliberately **no build-time define**. An earlier revision had one;
  it was removed because it implied an environment pipeline that does not
  exist, and because it was a second way to enable the demo (see §3).
- The toolchain in `tools/voice-demo/` has its own `package.json`, but it is
  **not** run by Vercel. It is a local developer tool that produces
  `js/voice-demo.js`, which is committed. Vercel never installs it.

Configuration therefore has to travel in the HTML itself.

## 2. The configuration block

To enable the demo on a page, add this to `<head>` **before** the
`<script defer src="/js/voice-demo.js">` tag, and remove the `hidden`
attribute from the mount `<div>`:

```html
<script>
  window.SEENN_VOICE_DEMO = {
    publicDemoMode: 'enabled',

    // Supabase project hosting the public-voice-demo function.
    // Staging and production are DIFFERENT projects — confirm which.
    endpointBaseUrl: 'https://<PROJECT-REF>.supabase.co',

    // Supabase ANON / publishable key ONLY.
    // Never a service-role key, never an sb_secret_* key. The widget refuses
    // to start if it detects one, but do not rely on that.
    anonKey: '<SUPABASE_ANON_OR_PUBLISHABLE_KEY>',

    // Cloudflare Turnstile site key. Required when enabled — see §4.
    turnstileSiteKey: '<TURNSTILE_SITE_KEY>'
  };
</script>
```

Every value above is a placeholder. Do not commit real ones until the endpoint
is live and someone has decided which Supabase project the site points at.

### Optional keys

| Key | Default | Notes |
|---|---|---|
| `locale` | `null` | `'en' \| 'he' \| 'ar'`. `null` follows `<html lang>`. |
| `maxSessionSeconds` | `120` | Hard client-side ceiling, independent of `expires_at`. |
| `reconnectTimeoutSeconds` | `20` | How long a reconnect may run before it is an error. |
| `orbSize` | `200` | Diameter in px. |
| `renderWhenUnavailable` | `false` | Show a greyed "unavailable" panel instead of nothing. |
| `livekitModuleUrl` | pinned | See §5. Change only with a deliberate version bump. |
| `languageLookupUrl` | `/api/voice-demo-language` | Same-origin resolver. If it fails twice, no session is requested. |
| `languageLookupTimeoutMs` | `1500` | Per-attempt deadline; the lookup is attempted at most twice. |

The session Edge Function also requires an explicit canonical `language`.
There is no server-side default, so a broken or bypassed website path cannot
silently open in English.

## 3. Enabling is asymmetric — on purpose

Exactly one thing can turn the demo **on**:

```js
window.SEENN_VOICE_DEMO.publicDemoMode === 'enabled'
```

Everything else is a **kill switch**: it can force the demo off and can never
turn it on.

| Source | Can disable | Can enable |
|---|---|---|
| `window.SEENN_VOICE_DEMO` | yes | **yes — the only one** |
| `?voicedemo=off` | yes | no |
| `<meta name="seenn:public-demo-mode" content="disabled">` | yes | no |

`?voicedemo=enabled` used to work. It was removed: a URL that anyone can
construct, on a page they do not control, is not an acceptable way to switch on
a feature that asks for a microphone. The meta tag remains as a way to kill the
demo in production without a code change.

## 4. Turnstile is mandatory when enabled

The endpoint is public, anonymous, and spends real AI minutes per session. So
when `publicDemoMode` is `enabled`, the widget **fails closed** unless all of
`endpointBaseUrl`, `anonKey` and `turnstileSiteKey` are present — it renders as
`unavailable` rather than posting unprotected.

A fresh, single-use token is obtained immediately before every POST and
discarded afterwards, on success and on failure alike. The Cloudflare script is
fetched lazily on the first token request, so a page with the demo off makes no
request to Cloudflare at all.

## 5. Pinned LiveKit version

`livekit-client` is pinned to an exact immutable version, not a `@2` range:

```
https://cdn.jsdelivr.net/npm/livekit-client@2.21.0/+esm
```

A floating major tag means the code a visitor executes can change without any
commit here — a supply-chain surface on a page holding a microphone permission
and a session token. Bump `LIVEKIT_CLIENT_VERSION` in `src/config.ts`
deliberately, and rebuild.

## 6. Turning it on — the full checklist

1. Backend endpoint deployed and reachable.
2. `PUBLIC_DEMO_MODE=enabled` server-side (otherwise expect `503 demo_disabled`,
   which is correct, not a bug).
3. Voice agent's browser-mode branch deployed, or the visitor gets a connected
   UI and silence.
4. Decide staging vs production Supabase project.
5. Turnstile site key issued, and the matching secret configured server-side.
6. Add the `window.SEENN_VOICE_DEMO` block to the page.
7. Remove `hidden` from the mount `<div>`.
8. Rebuild and commit `js/voice-demo.js` if `src/` changed.

Steps 6 and 7 are both required. Neither alone exposes the widget.

## 7. Local preview

`voice-demo-preview.html` at the repository root (gitignored) mounts the widget
in all three locales against a hostname that cannot resolve. That is the way to
look at the UI without touching the real pages.
