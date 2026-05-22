# GibRunner

Cloudflare Worker control plane to trigger GitHub Actions sessions on allowlisted repositories, with SSH/Web Terminal access and auto-expire flow.

## Features

- Token-based dispatch (PAT or classic token)
- Allowlist validation using Cloudflare KV
- One active session per repository
- Duration hard limit up to 4 hours
- Linux-only GitHub-hosted runner sessions
- SSH and Web Terminal connection details exposed to UI via tmate
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

Reference workflow template is available at `templates/create-ubuntu.yml`.

## Security notes

- User GitHub token is encrypted with AES-GCM using `WEBHOOK_SECRET` and stored temporarily per session in KV.
- Token KV keys use `token:{request_id}` and expire automatically after session duration + 15 minutes.
- Session lock key is `active:owner/repo`.
- Token should never be logged in plaintext in downstream tooling.
- SSH/Web Terminal access is provided through tmate and expires with the GitHub Actions session.
