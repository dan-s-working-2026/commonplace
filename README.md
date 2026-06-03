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
