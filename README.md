# Website Metadata API

## Product Summary
Fetch a public web page and return title, meta description, Open Graph tags, canonical URL, lang, favicon URL, robots rules, and schema summary.

## Route List
- GET /v1/metadata?url=
- GET /v1/favicon?url=
- GET /v1/schema?url=
- POST /v1/metadata/batch
- scopes: metadata:read
- ssrf_guard: strict
- fetch_caps: 2MB body, 5 redirects, 8s timeout
- cache_ttl: 6h
- happy_path: GET /v1/metadata?url=https://example.com returns title, description, og, canonical
- blocked_target: GET with url=http://127.0.0.1 returns 400
- rate_limit: burst over limit returns 429

## Auth Model
- **Type**: API Key (Bearer Token)
- **Header**: `Authorization: Bearer <api_key>`
- **Storage**: Hashed storage in Cloudflare KV
- **Advanced**: HMAC Signature required for write routes (X-Timestamp, X-Nonce, X-Signature)

## Rate Limit Model
- **Model**: Token Bucket (per API Key and per IP)
- **Free Plan**: 60 req/min, 5000/day
- **Pro Plan**: 300 req/min, 100,000/day
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Required Cloudflare Bindings
- **KV**: Used for API key metadata, rate limiting, and asset storage.

## Local Setup
```bash
npm install
cp .env.example .env
npm run dev
```

## Test Commands
```bash
npm test        # Run Vitest
npm run lint    # Run ESLint
npm run typecheck # Run TSC
```

## Deploy Steps
```bash
# 1. Create KV/R2 namespaces in Cloudflare
# 2. Update wrangler.jsonc with namespace IDs
# 3. Add secrets
wrangler secret put API_KEY_SECRET
# 4. Deploy
npm run deploy
```

## Security Notes
- **SSRF Guard**: Strict blocking of private/local IP ranges on all URL-fetching routes.
- **Request IDs**: `X-Request-Id` included in every response for tracing.
- **Strict Validation**: Zod-based input validation for all queries and bodies.
- **Redaction**: Automatic redaction of PII and secrets in logs.

## Example Request
```bash
curl -X GET "http://localhost:8787/v1/metadata?url=" \
     -H "Authorization: Bearer YOUR_API_KEY"
```

## Response Shape
- **Success**: `{ ok: true, data: {...}, meta: {...}, request_id: "..." }`
- **Error**: `{ ok: false, error: { code: "...", message: "..." }, request_id: "..." }`
