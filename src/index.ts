interface Env {
  APP_KV: KVNamespace;
  CLIENT_KEY: string;
  WEBHOOK_SECRET: string;
  MAX_SESSION_MINUTES?: string;
  RATE_LIMIT_CREATE?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  STATUS_STALE_SECONDS?: string;
}

type SessionStatus = "queued" | "running" | "success" | "failed" | "expired" | "cancelled";

type SessionPhase =
  | "queued"
  | "validating"
  | "dispatching"
  | "cloning"
  | "provisioning"
  | "rustdesk_starting"
  | "ready"
  | "expiring"
  | "failed"
  | "success"
  | "expired"
  | "cancelled";

interface SessionRecord {
  request_id: string;
  repo: string;
  os_runner: "ubuntu-latest" | "windows-latest";
  duration_minutes: number;
  status: SessionStatus;
  phase: SessionPhase;
  run_id?: number;
  workflow_url?: string;
  started_at: string;
  expires_at: string;
  updated_at: string;
  error?: { code: string; message: string; troubleshooting?: string[] };
}

interface ConnectionRecord {
  rustdesk_id?: string;
  rustdesk_password?: string;
  tmate_ssh?: string;
  tmate_web?: string;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const UI_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GibRunner</title>
  <style>
    :root { --bg:#f4f7fb; --card:#ffffff; --text:#121722; --muted:#5e6878; --accent:#0068d6; --danger:#b00020; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: "Segoe UI", "Noto Sans", sans-serif; color:var(--text); background: radial-gradient(circle at 20% 20%, #e9f2ff, #f4f7fb 50%); }
    .wrap { max-width: 860px; margin: 2rem auto; padding: 1rem; }
    .card { background:var(--card); border-radius:16px; box-shadow:0 8px 30px rgba(20,38,66,.08); padding:1.2rem; }
    h1 { margin:0 0 1rem; font-size:1.5rem; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:.8rem; }
    label { font-size:.85rem; color:var(--muted); display:block; margin-bottom:.2rem; }
    input,select,button { width:100%; border:1px solid #ccd5e2; border-radius:10px; padding:.66rem .74rem; font-size:.95rem; }
    button { background:var(--accent); color:#fff; border:none; font-weight:600; cursor:pointer; }
    button:disabled { opacity:.6; cursor:not-allowed; }
    pre { background:#f7f9fc; border:1px solid #dde5f2; border-radius:10px; padding:.75rem; overflow:auto; min-height:140px; }
    .full { grid-column: 1 / -1; }
    .error { color:var(--danger); font-weight:600; }
    @media (max-width: 720px){ .grid{grid-template-columns:1fr;} }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Create Runner Session</h1>
      <div class="grid">
        <div class="full"><label>Client API Key</label><input id="client_key" type="password" /></div>
        <div class="full"><label>GitHub Token (PAT / Classic)</label><input id="github_token" type="password" /></div>
        <div><label>Repo (owner/repo)</label><input id="repo" placeholder="owner/repo" /></div>
        <div><label>OS Runner</label><select id="os_runner"><option value="ubuntu-latest">ubuntu-latest</option><option value="windows-latest">windows-latest</option></select></div>
        <div><label>Duration (minutes, max 240)</label><input id="duration_minutes" type="number" value="120" min="15" max="240" /></div>
        <div><label>Username</label><input id="username" value="runneruser" /></div>
        <div class="full"><label>Password</label><input id="password" type="password" /></div>
        <div class="full"><button id="create_btn">Create</button></div>
      </div>
      <p id="notice"></p>
      <pre id="output"></pre>
    </div>
  </div>
<script>
const out = document.getElementById('output');
const notice = document.getElementById('notice');
function setOut(v){ out.textContent = JSON.stringify(v, null, 2); }
async function poll(reqId, key){
  let done = false;
  while(!done){
    const r = await fetch('/api/v1/session/status?request_id=' + encodeURIComponent(reqId), { headers: { 'x-client-key': key } });
    const j = await r.json();
    setOut(j);
    done = ['success','failed','expired','cancelled'].includes(j.status);
    if(done && j.status === 'success'){
      const c = await fetch('/api/v1/session/connection?request_id=' + encodeURIComponent(reqId), { headers: { 'x-client-key': key } });
      const cj = await c.json();
      setOut({ status: j, connection: cj });
    }
    await new Promise(x => setTimeout(x, done ? 0 : 8000));
  }
}
document.getElementById('create_btn').addEventListener('click', async () => {
  notice.textContent = '';
  const body = {
    repo: document.getElementById('repo').value.trim(),
    os_runner: document.getElementById('os_runner').value,
    duration_minutes: Number(document.getElementById('duration_minutes').value),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value,
    github_token: document.getElementById('github_token').value
  };
  const key = document.getElementById('client_key').value;
  const r = await fetch('/api/v1/session/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client-key': key, 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  setOut(j);
  if(!r.ok){ notice.textContent = j?.error?.message || 'Failed'; notice.className='error'; return; }
  notice.textContent = 'Session queued. Polling status...'; notice.className='';
  poll(j.request_id, key);
});
</script>
</body>
</html>`;

const WORKFLOW_FILE = `.github/workflows/create-vps.yml`;

const WORKFLOW_CONTENT = `name: create-vps
run-name: create-vps-\${{ inputs.request_id }}

on:
  workflow_dispatch:
    inputs:
      os_runner:
        required: true
        type: string
      request_id:
        required: true
        type: string
      duration_minutes:
        required: true
        type: string
      username:
        required: true
        type: string
      password:
        required: true
        type: string
      callback_url:
        required: true
        type: string
      callback_secret:
        required: true
        type: string

jobs:
  run:
    runs-on: \${{ github.event.inputs.os_runner || 'ubuntu-latest' }}
    timeout-minutes: 250
    steps:
      - name: Notify cloning
        shell: bash
        run: |
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"running","phase":"cloning"}'

      - uses: actions/checkout@v4

      - name: Notify provisioning
        shell: bash
        run: |
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"running","phase":"provisioning"}'

      - name: Setup Linux user and RustDesk
        if: runner.os == 'Linux'
        shell: bash
        run: |
          sudo useradd -m \${{ github.event.inputs.username }} || true
          echo "\${{ github.event.inputs.username }}:\${{ github.event.inputs.password }}" | sudo chpasswd
          curl -L https://github.com/rustdesk/rustdesk/releases/latest/download/rustdesk-1.2.3-x86_64.deb -o /tmp/rustdesk.deb || true
          sudo dpkg -i /tmp/rustdesk.deb || sudo apt-get update && sudo apt-get install -f -y
          nohup rustdesk --service >/tmp/rustdesk.log 2>&1 &

      - name: Setup Windows user and RustDesk
        if: runner.os == 'Windows'
        shell: pwsh
        run: |
          $u = "\${{ github.event.inputs.username }}"
          $p = ConvertTo-SecureString "\${{ github.event.inputs.password }}" -AsPlainText -Force
          if (-not (Get-LocalUser -Name $u -ErrorAction SilentlyContinue)) { New-LocalUser -Name $u -Password $p }
          Set-LocalUser -Name $u -Password $p
          Invoke-WebRequest -Uri "https://github.com/rustdesk/rustdesk/releases/latest/download/rustdesk-1.2.3-x86_64.exe" -OutFile "$env:TEMP\\rustdesk.exe"
          Start-Process "$env:TEMP\\rustdesk.exe" -ArgumentList "--silent-install" -Wait
          Start-Process "C:\\Program Files\\RustDesk\\RustDesk.exe" -ArgumentList "--service"

      - name: Get RustDesk info and notify ready
        shell: bash
        run: |
          RID="unknown"
          RPW="\${{ github.event.inputs.password }}"
          if command -v rustdesk >/dev/null 2>&1; then
            RID=$(rustdesk --get-id || echo unknown)
          fi
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d "{\"request_id\":\"\${{ github.event.inputs.request_id }}\",\"status\":\"running\",\"phase\":\"ready\",\"connection\":{\"rustdesk_id\":\"$RID\",\"rustdesk_password\":\"$RPW\"}}"

      - name: Hold session
        shell: bash
        run: |
          mins=\${{ github.event.inputs.duration_minutes }}
          secs=$((mins*60))
          sleep "$secs"

      - name: Notify expired
        if: always()
        shell: bash
        run: |
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"expired","phase":"expired"}'
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(UI_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    if (!url.pathname.startsWith("/api/v1/")) {
      return jsonError(404, "NOT_FOUND", "Route not found");
    }

    if (!isAuthorizedClient(request, env)) {
      return jsonError(401, "UNAUTHORIZED_CLIENT", "Invalid client key");
    }

    if (request.method === "GET" && url.pathname === "/api/v1/allowlist/repos") {
      return handleAllowlist(env);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/session/create") {
      return handleCreate(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/v1/session/status") {
      return handleStatus(url, env);
    }

    if (request.method === "GET" && url.pathname === "/api/v1/session/connection") {
      return handleConnection(url, env);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/session/cancel") {
      return handleCancel(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/webhook/github") {
      return handleWebhook(request, env);
    }

    return jsonError(404, "NOT_FOUND", "Route not found");
  }
};

function isAuthorizedClient(request: Request, env: Env): boolean {
  const incoming = request.headers.get("x-client-key");
  return Boolean(env.CLIENT_KEY) && incoming === env.CLIENT_KEY;
}

async function handleAllowlist(env: Env): Promise<Response> {
  const keys = await env.APP_KV.list({ prefix: "allowlist:" });
  const repos = keys.keys.map((k) => k.name.replace("allowlist:", ""));
  return json({ repos });
}

async function handleCreate(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await consumeCreateRateLimit(env, ip))) {
    return jsonError(429, "RATE_LIMITED", "Too many create requests");
  }

  const body = (await request.json()) as Record<string, unknown>;
  const repo = str(body.repo);
  const osRunner = str(body.os_runner) as "ubuntu-latest" | "windows-latest";
  const durationMinutes = Number(body.duration_minutes);
  const username = str(body.username);
  const password = str(body.password);
  const githubToken = str(body.github_token);

  const validation = validateCreateInput(repo, osRunner, durationMinutes, username, password, githubToken, env);
  if (validation) return validation;

  const isAllowed = await env.APP_KV.get(`allowlist:${repo}`);
  if (!isAllowed) return jsonError(403, "REPO_NOT_ALLOWLISTED", "Repo is not allowlisted");

  const activeKey = `active:${repo}`;
  const active = await env.APP_KV.get(activeKey, "json") as SessionRecord | null;
  if (active && ["queued", "running"].includes(active.status)) {
    return jsonError(409, "SESSION_ALREADY_ACTIVE", "An active session already exists", { active_request_id: active.request_id });
  }

  const repoMeta = await ghGetRepo(repo, githubToken);
  if (!repoMeta.ok) return repoMeta.response;

  const requestId = `req_${crypto.randomUUID()}`;
  const now = new Date();
  const expires = new Date(now.getTime() + durationMinutes * 60_000);
  const runPayload = {
    ref: repoMeta.data.default_branch,
    inputs: {
      request_id: requestId,
      duration_minutes: String(durationMinutes),
      username,
      password,
      os_runner: osRunner,
      callback_url: `${new URL(request.url).origin}/api/v1/webhook/github`,
      callback_secret: env.WEBHOOK_SECRET
    }
  };

  const workflowReady = await ensureWorkflowFile(repo, repoMeta.data.default_branch, githubToken);
  if (!workflowReady.ok) return workflowReady.response;

  const dispatch = await ghDispatchWorkflow(repo, githubToken, runPayload);
  if (!dispatch.ok) return dispatch.response;

  const runInfo = await ghFindLatestRun(repo, githubToken, requestId);
  const runId = runInfo.ok ? runInfo.data.id : undefined;
  const workflowUrl = runId ? `https://github.com/${repo}/actions/runs/${runId}` : undefined;

  const record: SessionRecord = {
    request_id: requestId,
    repo,
    os_runner: osRunner,
    duration_minutes: durationMinutes,
    status: "queued",
    phase: "dispatching",
    run_id: runId,
    workflow_url: workflowUrl,
    started_at: now.toISOString(),
    expires_at: expires.toISOString(),
    updated_at: now.toISOString()
  };

  await env.APP_KV.put(`status:${requestId}`, JSON.stringify(record), { expirationTtl: 6 * 3600 });
  await env.APP_KV.put(activeKey, JSON.stringify(record), { expirationTtl: durationMinutes * 60 + 900 });

  return json(record, 202);
}

function validateCreateInput(
  repo: string,
  osRunner: "ubuntu-latest" | "windows-latest",
  durationMinutes: number,
  username: string,
  password: string,
  githubToken: string,
  env: Env
): Response | null {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return jsonError(400, "VALIDATION_ERROR", "repo must be owner/repo");
  if (!["ubuntu-latest", "windows-latest"].includes(osRunner)) return jsonError(400, "VALIDATION_ERROR", "Unsupported os_runner");
  const max = Number(env.MAX_SESSION_MINUTES || "240");
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > max) {
    return jsonError(400, "VALIDATION_ERROR", `duration_minutes must be 15..${max}`);
  }
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) return jsonError(400, "VALIDATION_ERROR", "Invalid username");
  if (!isStrongPassword(password)) return jsonError(400, "VALIDATION_ERROR", "Password must be min 12 and contain upper/lower/number/symbol");
  if (!githubToken) return jsonError(400, "VALIDATION_ERROR", "github_token required");
  return null;
}

async function handleStatus(url: URL, env: Env): Promise<Response> {
  const requestId = url.searchParams.get("request_id");
  if (!requestId) return jsonError(400, "VALIDATION_ERROR", "request_id is required");
  const record = await env.APP_KV.get(`status:${requestId}`, "json") as SessionRecord | null;
  if (!record) return jsonError(404, "NOT_FOUND", "Session not found");
  return json(record);
}

async function handleConnection(url: URL, env: Env): Promise<Response> {
  const requestId = url.searchParams.get("request_id");
  if (!requestId) return jsonError(400, "VALIDATION_ERROR", "request_id is required");
  const session = await env.APP_KV.get(`status:${requestId}`, "json") as SessionRecord | null;
  if (!session) return jsonError(404, "NOT_FOUND", "Session not found");
  const conn = await env.APP_KV.get(`conn:${requestId}`, "json") as ConnectionRecord | null;
  if (!conn) return jsonError(409, "NOT_READY", "Connection is not ready", { phase: session.phase, status: session.status });
  return json({ request_id: requestId, status: session.status, phase: session.phase, connection: conn, expires_at: session.expires_at });
}

async function handleCancel(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;
  const requestId = str(body.request_id);
  const githubToken = str(body.github_token);
  if (!requestId || !githubToken) return jsonError(400, "VALIDATION_ERROR", "request_id and github_token are required");
  const rec = await env.APP_KV.get(`status:${requestId}`, "json") as SessionRecord | null;
  if (!rec) return jsonError(404, "NOT_FOUND", "Session not found");

  if (rec.run_id) {
    const cancel = await ghCancelRun(rec.repo, rec.run_id, githubToken);
    if (!cancel.ok) return cancel.response;
  }

  rec.status = "cancelled";
  rec.phase = "cancelled";
  rec.updated_at = new Date().toISOString();
  await env.APP_KV.put(`status:${requestId}`, JSON.stringify(rec), { expirationTtl: 6 * 3600 });
  await env.APP_KV.delete(`active:${rec.repo}`);
  return json({ request_id: requestId, status: "cancelled" });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("x-hook-signature");
  if (signature !== env.WEBHOOK_SECRET) {
    return jsonError(401, "UNAUTHORIZED_WEBHOOK", "Invalid signature");
  }

  const body = (await request.json()) as {
    request_id?: string;
    status?: SessionStatus;
    phase?: SessionPhase;
    connection?: ConnectionRecord;
    error?: { code: string; message: string; troubleshooting?: string[] };
  };
  if (!body.request_id) return jsonError(400, "VALIDATION_ERROR", "request_id is required");
  const existing = await env.APP_KV.get(`status:${body.request_id}`, "json") as SessionRecord | null;
  if (!existing) return jsonError(404, "NOT_FOUND", "Session not found");

  const next: SessionRecord = {
    ...existing,
    status: body.status || existing.status,
    phase: body.phase || existing.phase,
    updated_at: new Date().toISOString(),
    error: body.error || existing.error
  };

  await env.APP_KV.put(`status:${body.request_id}`, JSON.stringify(next), { expirationTtl: 6 * 3600 });
  if (body.connection) {
    await env.APP_KV.put(`conn:${body.request_id}`, JSON.stringify(body.connection), { expirationTtl: 6 * 3600 });
  }
  if (["success", "failed", "expired", "cancelled"].includes(next.status)) {
    await env.APP_KV.delete(`active:${next.repo}`);
  }
  return json({ ok: true });
}

async function consumeCreateRateLimit(env: Env, ip: string): Promise<boolean> {
  const limit = Number(env.RATE_LIMIT_CREATE || "5");
  const windowSec = Number(env.RATE_LIMIT_WINDOW_SECONDS || "600");
  const key = `rl:create:${ip}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const current = Number((await env.APP_KV.get(key)) || "0");
  if (current >= limit) return false;
  await env.APP_KV.put(key, String(current + 1), { expirationTtl: windowSec + 5 });
  return true;
}

async function ensureWorkflowFile(repo: string, branch: string, token: string): Promise<{ ok: true } | { ok: false; response: Response }> {
  const checkUrl = `https://api.github.com/repos/${repo}/contents/${WORKFLOW_FILE}?ref=${encodeURIComponent(branch)}`;
  const check = await ghApi(checkUrl, token, { method: "GET" });
  if (check.status === 200) return { ok: true };
  if (check.status !== 404) return { ok: false, response: await toGitHubError(check, "Failed to check workflow file") };

  const putUrl = `https://api.github.com/repos/${repo}/contents/${WORKFLOW_FILE}`;
  const content = toBase64(WORKFLOW_CONTENT);
  const put = await ghApi(putUrl, token, {
    method: "PUT",
    body: JSON.stringify({ message: "Add create-vps workflow", content, branch })
  });
  if (put.status >= 200 && put.status < 300) return { ok: true };
  return { ok: false, response: await toGitHubError(put, "Failed to install workflow file") };
}

async function ghGetRepo(repo: string, token: string): Promise<{ ok: true; data: { default_branch: string } } | { ok: false; response: Response }> {
  const resp = await ghApi(`https://api.github.com/repos/${repo}`, token, { method: "GET" });
  if (resp.status >= 200 && resp.status < 300) {
    const data = (await resp.json()) as { default_branch: string };
    return { ok: true, data };
  }
  return { ok: false, response: await toGitHubError(resp, "Token cannot access target repo") };
}

async function ghDispatchWorkflow(repo: string, token: string, payload: Record<string, unknown>): Promise<{ ok: true } | { ok: false; response: Response }> {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/create-vps.yml/dispatches`;
  const resp = await ghApi(url, token, { method: "POST", body: JSON.stringify(payload) });
  if (resp.status === 204) return { ok: true };
  return { ok: false, response: await toGitHubError(resp, "Failed to dispatch workflow") };
}

async function ghFindLatestRun(repo: string, token: string, requestId: string): Promise<{ ok: true; data: { id: number } } | { ok: false }> {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/create-vps.yml/runs?per_page=5`;
  const resp = await ghApi(url, token, { method: "GET" });
  if (resp.status < 200 || resp.status >= 300) return { ok: false };
  const data = (await resp.json()) as { workflow_runs?: Array<{ id: number; display_title?: string; name?: string }> };
  const run = data.workflow_runs?.find((r) => (r.display_title || "").includes(requestId)) || data.workflow_runs?.[0];
  if (!run) return { ok: false };
  return { ok: true, data: { id: run.id } };
}

async function ghCancelRun(repo: string, runId: number, token: string): Promise<{ ok: true } | { ok: false; response: Response }> {
  const url = `https://api.github.com/repos/${repo}/actions/runs/${runId}/cancel`;
  const resp = await ghApi(url, token, { method: "POST" });
  if (resp.status === 202 || resp.status === 409) return { ok: true };
  return { ok: false, response: await toGitHubError(resp, "Failed to cancel workflow run") };
}

function ghApi(url: string, token: string, init: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "GibRunner",
      "content-type": "application/json",
      ...(init.headers || {})
    }
  });
}

async function toGitHubError(resp: Response, fallbackMessage: string): Promise<Response> {
  let message = fallbackMessage;
  let details: unknown;
  try {
    const j = (await resp.json()) as { message?: string; errors?: unknown };
    message = j.message || fallbackMessage;
    details = j.errors;
  } catch {
    message = fallbackMessage;
  }
  return jsonError(resp.status === 401 ? 403 : 502, "GITHUB_API_ERROR", message, { github_status: resp.status, details });
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isStrongPassword(v: string): boolean {
  return v.length >= 12 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v);
}

function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function jsonError(status: number, code: string, message: string, details?: unknown): Response {
  return json({ error: { code, message, details } }, status);
}
