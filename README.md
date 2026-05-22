# GibRunner

Cloudflare Worker control plane to trigger GitHub Actions sessions on allowlisted repositories, with RustDesk connection details and auto-expire flow.

## Features

- Token-based dispatch (PAT or classic token)
- Allowlist validation using Cloudflare KV
- One active session per repository
- Duration hard limit up to 4 hours
- Runner OS selection: Ubuntu/Windows
- RustDesk connection details exposure to UI
- Structured status and troubleshooting states

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create KV namespace and set `APP_KV` id in `wrangler.toml`.

3. Set secrets:

```bash
wrangler secret put WEBHOOK_SECRET
```

4. Add allowlist entries:

```bash
wrangler kv key put --binding APP_KV "allowlist:owner/repo" "1"
```

5. Run local dev:

```bash
npm run dev
```

## API

- `POST /api/v1/session/create`
- `GET /api/v1/session/status?request_id=...`
- `GET /api/v1/session/connection?request_id=...`
- `POST /api/v1/session/cancel`
- `GET /api/v1/allowlist/repos`
- `POST /api/v1/webhook/github`

User UI only requires GitHub token input. Repository resolution order:

1. Use first allowlisted repo accessible by the token.
2. If none is accessible, use `${token_login}/gibrunner`.
3. If `${token_login}/gibrunner` does not exist, create it as a private repo and inject workflow files only.

## Workflow installation

When session creation is requested, the Worker ensures these workflow files exist in the target repo. If missing or outdated, it creates/updates them automatically:

- `.github/workflows/create-ubuntu.yml`
- `.github/workflows/create-windows.yml`

Reference workflow templates are available at `templates/create-ubuntu.yml` and `templates/create-windows.yml`.

## Security notes

- User GitHub token is encrypted with AES-GCM using `WEBHOOK_SECRET` and stored temporarily per session in KV.
- Token KV keys use `token:{request_id}` and expire automatically after session duration + 15 minutes.
- Session lock key is `active:owner/repo`.
- Password/token should never be logged in plaintext in downstream tooling.
- RustDesk on GitHub-hosted runner is best effort due ephemeral runtime/network constraints.
