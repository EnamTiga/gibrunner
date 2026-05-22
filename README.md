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
3. If `${token_login}/gibrunner` does not exist, generate it from the configured template repo (`TEMPLATE_REPO`, default `EnamTiga/gibrunner`) as a private repo, then continue.

For public users, the template repo must be accessible to their token. The simplest setup is making the admin repo public and marking it as a GitHub template repository.

## Workflow installation

When session creation is requested, the Worker ensures `.github/workflows/create-vps.yml` exists in target repo. If missing, it creates it automatically.

Reference workflow template is available at `templates/create-vps.yml`.

## Security notes

- User GitHub token is used per request and not persisted.
- Session lock key is `active:owner/repo`.
- Password/token should never be logged in plaintext in downstream tooling.
- RustDesk on GitHub-hosted runner is best effort due ephemeral runtime/network constraints.
