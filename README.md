# Commonplace

Every communication has hidden meaning. Commonplace helps you discover it.

## Architecture

Commonplace is a static GitHub Pages app with a small Cloudflare Worker backend:

Static frontend -> Cloudflare Worker -> OpenAI Responses API

No OpenAI, Anthropic, or other service key belongs in `index.html`, GitHub Pages output, or any browser-delivered asset.

## Frontend Deployment

1. Edit `index.html`.
2. Replace both Worker endpoint constants near the top of the script:

   ```js
   const ORACLE_ENDPOINT = "https://commonplace-oracle.YOUR-CLOUDFLARE-SUBDOMAIN.workers.dev/oracle";
   const RELAY_ENDPOINT = "https://commonplace-oracle.YOUR-CLOUDFLARE-SUBDOMAIN.workers.dev/relay";
   ```

3. Commit and push to the branch GitHub Pages uses for `https://dan-s-working-2026.github.io/commonplace/`.
4. Open the deployed page and choose a lens to confirm the oracle calls the Worker endpoint.

## Worker Deployment

Log in to Cloudflare with Wrangler:

```sh
npx wrangler login
```

Deploy the Worker:

```sh
cd worker
npx wrangler deploy
```

Current deployed Worker URL:

```text
https://commonplace-oracle.doscherer.workers.dev
```

Set the OpenAI secret. Do not put this value in `wrangler.toml` or frontend code.

```sh
npx wrangler secret put OPENAI_API_KEY
```

The model can be changed in `worker/wrangler.toml`:

```toml
[vars]
OPENAI_MODEL = "gpt-4o-mini"
```

## Backend Routes

`POST /oracle` accepts:

```json
{
  "voiceKey": "socrates",
  "voiceName": "Socrates",
  "voiceSystem": "Voice system prompt",
  "isPopVoice": false,
  "context": "Conversation context"
}
```

It returns:

```json
{ "text": "Oracle response text." }
```

`POST /relay` accepts:

```json
{ "content": "Feedback or sponsor inquiry text." }
```

It currently returns `{ "ok": true }` as a safe placeholder. Real delivery still needs an email service such as Resend, SendGrid, Formspree, Netlify Forms, or another provider.

## Security Notes

- Never commit service keys or secrets.
- `OPENAI_API_KEY` must be configured only as a Cloudflare Worker secret.
- CORS is restricted to `https://dan-s-working-2026.github.io`.
- The Worker rejects oversized request bodies and missing `voiceSystem`, `context`, or relay `content`.

## Optional Secure Anthropic Setup

The current production Worker uses OpenAI. If you later choose to add Anthropic as an alternate backend, keep the same secure pattern:

Static frontend -> Cloudflare Worker -> Anthropic API

Do not restore direct browser calls to Anthropic, and do not put an Anthropic key in `index.html`.

1. Create an Anthropic API key in the Claude Console:

   ```text
   https://console.anthropic.com/
   ```

2. Store it as a Cloudflare Worker secret:

   ```sh
   cd worker
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

3. Update only the Worker backend to call Anthropic server-side. The frontend should still call your Worker endpoint, not `https://api.anthropic.com`.

4. Keep `.env`, local shell variables, and committed files free of API keys unless you deliberately need a local development key. Anthropic documents `ANTHROPIC_API_KEY` as the API key environment variable, and warns that environment keys can cause API-billed usage when tools detect them.

Anthropic free credits, billing rules, and account requirements can change. Check the Claude Console before relying on a free tier.
