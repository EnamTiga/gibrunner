interface Env {
  APP_KV: KVNamespace;
  WEBHOOK_SECRET: string;
  MAX_SESSION_MINUTES?: string;
  RATE_LIMIT_CREATE?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  STATUS_STALE_SECONDS?: string;
  TEMPLATE_REPO?: string;
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
    .conn { margin-top: .8rem; padding: .8rem; background:#f8fbff; border:1px solid #d9e7ff; border-radius:10px; display:none; }
    .conn-grid { display:grid; grid-template-columns:1fr auto; gap:.45rem; }
    .conn-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:#fff; border:1px solid #cfd9e8; border-radius:8px; padding:.5rem .6rem; overflow:auto; }
    .copy-btn { width:auto; padding:.5rem .7rem; font-size:.85rem; }
    .toast { position: fixed; right: 1rem; bottom: 1rem; width: min(420px, calc(100vw - 2rem)); background:#101827; color:#fff; border-radius:14px; box-shadow:0 14px 40px rgba(0,0,0,.22); padding:1rem; display:none; z-index:10; }
    .toast-title { font-weight:700; margin-bottom:.25rem; }
    .toast-body { color:#d7deea; font-size:.92rem; line-height:1.45; margin-bottom:.8rem; }
    .toast-actions { display:flex; gap:.5rem; }
    .toast-actions button { width:auto; padding:.55rem .75rem; }
    .toast-secondary { background:#344056; }
    .toast-danger { background:#b42318; }
    .status-box { margin-top:.8rem; padding:.85rem; border:1px solid #d7e2f0; border-radius:12px; background:#fbfdff; display:none; }
    .status-row { display:flex; justify-content:space-between; gap:.8rem; padding:.28rem 0; border-bottom:1px solid #edf2f8; }
    .status-row:last-child { border-bottom:none; }
    .status-label { color:var(--muted); }
    .status-value { font-weight:650; text-align:right; }
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
        <div class="full"><label>GitHub Token (PAT / Classic)</label><input id="github_token" type="password" /></div>
        <div><label>OS Runner</label><select id="os_runner"><option value="ubuntu-latest">ubuntu-latest</option><option value="windows-latest">windows-latest</option></select></div>
        <div><label>Duration (minutes, max 240)</label><input id="duration_minutes" type="number" value="120" min="15" max="240" /></div>
        <div><label>Username</label><input id="username" value="runneruser" /></div>
        <div class="full"><label>Password</label><input id="password" type="password" /></div>
        <div class="full"><button id="generate_password_btn" type="button">Generate Password</button></div>
        <div class="full"><button id="create_btn">Create</button></div>
        <div class="full"><button id="terminate_btn" type="button">Terminate Session</button></div>
      </div>
      <p id="notice"></p>
      <div id="status_box" class="status-box">
        <div class="status-row"><span class="status-label">Status</span><span id="status_text" class="status-value">-</span></div>
        <div class="status-row"><span class="status-label">Phase</span><span id="phase_text" class="status-value">-</span></div>
        <div class="status-row"><span class="status-label">Repo</span><span id="repo_text" class="status-value">-</span></div>
        <div class="status-row"><span class="status-label">Expires</span><span id="expires_text" class="status-value">-</span></div>
        <div class="status-row"><span class="status-label">Last checked</span><span id="last_checked_text" class="status-value">-</span></div>
      </div>
      <div id="connection_box" class="conn">
        <strong>Connection Info</strong>
        <div class="conn-grid" style="margin-top:.5rem;">
          <div id="conn_rustdesk_id" class="conn-code">-</div><button class="copy-btn" data-copy="conn_rustdesk_id" data-label="Copy ID">Copy ID</button>
          <div id="conn_rustdesk_password" class="conn-code">-</div><button class="copy-btn" data-copy="conn_rustdesk_password" data-label="Copy Password">Copy Password</button>
          <div id="conn_tmate_ssh" class="conn-code">-</div><button class="copy-btn" data-copy="conn_tmate_ssh" data-label="Copy SSH">Copy SSH</button>
          <div id="conn_tmate_web" class="conn-code">-</div><button class="copy-btn" data-copy="conn_tmate_web" data-label="Copy Link">Copy Link</button>
        </div>
      </div>
      <pre id="output"></pre>
    </div>
  </div>
  <div id="active_session_toast" class="toast">
    <div class="toast-title">Active session still running</div>
    <div id="active_session_toast_body" class="toast-body"></div>
    <div class="toast-actions">
      <button id="toast_cancel_btn" type="button" class="toast-secondary">Cancel</button>
      <button id="toast_terminate_btn" type="button" class="toast-danger">Terminate Session</button>
    </div>
  </div>
<script>
const out = document.getElementById('output');
const notice = document.getElementById('notice');
const connectionBox = document.getElementById('connection_box');
const activeSessionToast = document.getElementById('active_session_toast');
const activeSessionToastBody = document.getElementById('active_session_toast_body');
const statusBox = document.getElementById('status_box');
const storageKey = 'gibrunner.currentRequestId';
let currentRequestId = '';
let activePollRequestId = '';
function setOut(v){ out.textContent = JSON.stringify(v, null, 2); }
function setText(id, value){ document.getElementById(id).textContent = value || '-'; }
function phaseLabel(phase){
  return ({
    queued: 'Menunggu runner GitHub',
    validating: 'Memvalidasi token dan repo',
    dispatching: 'Mengirim request ke GitHub Actions',
    cloning: 'Clone/checkout repo',
    provisioning: 'Menyiapkan runner dan akun login',
    rustdesk_starting: 'Menjalankan RustDesk',
    ready: 'Siap digunakan',
    expiring: 'Sesi akan selesai',
    failed: 'Gagal',
    success: 'Selesai',
    expired: 'Expired',
    cancelled: 'Dibatalkan'
  })[phase] || phase || '-';
}
function renderStatus(session){
  statusBox.style.display = 'block';
  setText('status_text', session.status || '-');
  setText('phase_text', phaseLabel(session.phase));
  setText('repo_text', session.repo || '-');
  setText('expires_text', session.expires_at ? new Date(session.expires_at).toLocaleString() : '-');
  setText('last_checked_text', new Date().toLocaleTimeString());
}
function renderConnection(conn){
  if(!conn){ connectionBox.style.display = 'none'; return; }
  connectionBox.style.display = 'block';
  setText('conn_rustdesk_id', conn.rustdesk_id || '-');
  setText('conn_rustdesk_password', conn.rustdesk_password || '-');
  setText('conn_tmate_ssh', conn.tmate_ssh || '-');
  setText('conn_tmate_web', conn.tmate_web || '-');
}
function showActiveSessionToast(reqId, session){
  currentRequestId = reqId || currentRequestId;
  const status = session?.status || 'running';
  const phase = session?.phase || 'queued';
  const repo = session?.repo || 'current repo';
  activeSessionToastBody.textContent = repo + ' has an active session (' + status + ' / ' + phase + '). You can keep watching progress, cancel this message, or terminate the workflow session.';
  activeSessionToast.style.display = 'block';
}
function hideActiveSessionToast(){
  activeSessionToast.style.display = 'none';
}
async function poll(reqId){
  currentRequestId = reqId;
  activePollRequestId = reqId;
  localStorage.setItem(storageKey, reqId);
  let done = false;
  let shownConnection = false;
  while(!done && activePollRequestId === reqId){
    const r = await fetch('/api/v1/session/status?request_id=' + encodeURIComponent(reqId));
    const j = await r.json();
    setOut(j);
    if(r.ok){ renderStatus(j); }
    done = ['success','failed','expired','cancelled'].includes(j.status);
    if((j.phase === 'ready' || done) && !shownConnection){
      const c = await fetch('/api/v1/session/connection?request_id=' + encodeURIComponent(reqId));
      const cj = await c.json();
      if(c.ok){
        renderConnection(cj.connection);
        setOut({ status: j, connection: cj });
        shownConnection = true;
      }
    }
    if(done){
      localStorage.removeItem(storageKey);
      break;
    }
    await new Promise(x => setTimeout(x, 4000));
  }
}
document.getElementById('create_btn').addEventListener('click', async () => {
  notice.textContent = '';
    const body = {
    os_runner: document.getElementById('os_runner').value,
    duration_minutes: Number(document.getElementById('duration_minutes').value),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value,
    github_token: document.getElementById('github_token').value
  };
  const r = await fetch('/api/v1/session/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  setOut(j);
  if(!r.ok){
    if((r.status === 409 && j?.error?.code === 'SESSION_ALREADY_ACTIVE') || (r.status === 429 && j?.error?.code === 'RATE_LIMITED' && j?.error?.details?.active_request_id)){
      const reqId = j?.error?.details?.active_request_id;
      const session = j?.error?.details?.active_session;
      notice.textContent = 'Active session found. Showing live progress...';
      notice.className = '';
      if(reqId){
        showActiveSessionToast(reqId, session);
        poll(reqId);
      }
      return;
    }
    notice.textContent = j?.error?.message || 'Failed'; notice.className='error'; return;
  }
  notice.textContent = 'Session queued. Polling status...'; notice.className='';
  currentRequestId = j.request_id;
  localStorage.setItem(storageKey, j.request_id);
  poll(j.request_id);
});

document.getElementById('generate_password_btn').addEventListener('click', () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{}';
  let pass = '';
  for (let i = 0; i < 16; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  document.getElementById('password').value = pass;
});

document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-copy');
    const label = btn.getAttribute('data-label') || 'Copy';
    const text = document.getElementById(id).textContent || '';
    if(text && text !== '-'){
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = label; }, 1200);
    }
  });
});

async function terminateCurrentSession(){
  const token = document.getElementById('github_token').value;
  if(!currentRequestId){
    notice.textContent = 'No active request_id to terminate yet.';
    notice.className = 'error';
    return;
  }
  if(!token){
    notice.textContent = 'GitHub token is required to terminate session.';
    notice.className = 'error';
    return;
  }

  const r = await fetch('/api/v1/session/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ request_id: currentRequestId, github_token: token })
  });
  const j = await r.json();
  setOut(j);
  if(!r.ok){
    notice.textContent = j?.error?.message || 'Failed to terminate session';
    notice.className = 'error';
    return;
  }
  notice.textContent = 'Session ' + currentRequestId + ' terminated.';
  notice.className = '';
  connectionBox.style.display = 'none';
  localStorage.removeItem(storageKey);
  hideActiveSessionToast();
}

document.getElementById('terminate_btn').addEventListener('click', terminateCurrentSession);
document.getElementById('toast_terminate_btn').addEventListener('click', terminateCurrentSession);
document.getElementById('toast_cancel_btn').addEventListener('click', hideActiveSessionToast);

const restoredRequestId = localStorage.getItem(storageKey);
if(restoredRequestId){
  notice.textContent = 'Restored active session. Auto-updating progress...';
  currentRequestId = restoredRequestId;
  poll(restoredRequestId);
}
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

      - name: Notify RustDesk starting
        shell: bash
        run: |
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"running","phase":"rustdesk_starting"}'

      - name: Setup Linux user and RustDesk
        if: runner.os == 'Linux'
        timeout-minutes: 6
        shell: bash
        run: |
          set -euo pipefail
          sudo useradd -m \${{ github.event.inputs.username }} || true
          echo "\${{ github.event.inputs.username }}:\${{ github.event.inputs.password }}" | sudo chpasswd
          sudo apt-get update
          sudo apt-get install -y curl ca-certificates jq
          DEB_URL=$(curl -fsSL https://api.github.com/repos/rustdesk/rustdesk/releases/latest | jq -r '.assets[] | select(.name | test("x86_64.*\\.deb$")) | .browser_download_url' | head -n 1)
          if [ -z "$DEB_URL" ]; then echo "RustDesk .deb asset not found"; exit 40; fi
          timeout 90s curl -fL "$DEB_URL" -o /tmp/rustdesk.deb
          sudo apt-get install -y /tmp/rustdesk.deb || sudo apt-get install -f -y
          (nohup rustdesk --service >/tmp/rustdesk.log 2>&1 &) || true
          sleep 8

      - name: Setup Windows user and RustDesk
        if: runner.os == 'Windows'
        timeout-minutes: 6
        shell: pwsh
        run: |
          $ErrorActionPreference = "Stop"
          $u = "\${{ github.event.inputs.username }}"
          $p = ConvertTo-SecureString "\${{ github.event.inputs.password }}" -AsPlainText -Force
          if (-not (Get-LocalUser -Name $u -ErrorAction SilentlyContinue)) { New-LocalUser -Name $u -Password $p }
          Set-LocalUser -Name $u -Password $p
          $release = Invoke-RestMethod -Uri "https://api.github.com/repos/rustdesk/rustdesk/releases/latest"
          $asset = $release.assets | Where-Object { $_.name -match "x86_64.*\.exe$" } | Select-Object -First 1
          if (-not $asset) { throw "RustDesk .exe asset not found" }
          $installer = Join-Path $env:TEMP "rustdesk.exe"
          Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installer
          $proc = Start-Process $installer -ArgumentList "--silent-install" -PassThru
          if (-not $proc.WaitForExit(120000)) { Stop-Process -Id $proc.Id -Force; throw "RustDesk installer timeout" }
          $rustdesk = "C:\\Program Files\\RustDesk\\RustDesk.exe"
          if (-not (Test-Path $rustdesk)) { throw "RustDesk executable not found after install" }
          Start-Process $rustdesk -ArgumentList "--service"
          Start-Sleep -Seconds 8

      - name: Get Linux RustDesk info and notify ready
        if: runner.os == 'Linux'
        shell: bash
        run: |
          RID="unknown"
          RPW="\${{ github.event.inputs.password }}"
          for i in {1..10}; do
            if command -v rustdesk >/dev/null 2>&1; then RID=$(timeout 10s rustdesk --get-id 2>/dev/null || true); fi
            if [ -n "$RID" ] && [ "$RID" != "unknown" ]; then break; fi
            sleep 6
          done
          if [ -z "$RID" ] || [ "$RID" = "unknown" ]; then
            curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
              -H "content-type: application/json" \\
              -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
              -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"failed","phase":"failed","error":{"code":"RUSTDESK_ID_MISSING","message":"RustDesk started but ID could not be read","troubleshooting":["Open the GitHub Actions log for RustDesk output","Try ubuntu-latest first","Retry after terminating this session"]}}'
            exit 42
          fi
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d "{\"request_id\":\"\${{ github.event.inputs.request_id }}\",\"status\":\"running\",\"phase\":\"ready\",\"connection\":{\"rustdesk_id\":\"$RID\",\"rustdesk_password\":\"$RPW\"}}"

      - name: Get Windows RustDesk info and notify ready
        if: runner.os == 'Windows'
        shell: pwsh
        run: |
          $rid = "unknown"
          $rustdesk = "C:\\Program Files\\RustDesk\\RustDesk.exe"
          for ($i = 0; $i -lt 10; $i++) {
            if (Test-Path $rustdesk) { $rid = (& $rustdesk --get-id 2>$null) }
            if ($rid -and $rid -ne "unknown") { break }
            Start-Sleep -Seconds 6
          }
          if (-not $rid -or $rid -eq "unknown") {
            $body = @{ request_id = "\${{ github.event.inputs.request_id }}"; status = "failed"; phase = "failed"; error = @{ code = "RUSTDESK_ID_MISSING"; message = "RustDesk started but ID could not be read"; troubleshooting = @("Open the GitHub Actions log for RustDesk output", "Try ubuntu-latest first", "Retry after terminating this session") } } | ConvertTo-Json -Depth 5
            Invoke-RestMethod -Method Post -Uri "\${{ github.event.inputs.callback_url }}" -Headers @{ "x-hook-signature" = "\${{ github.event.inputs.callback_secret }}" } -ContentType "application/json" -Body $body
            exit 42
          }
          $body = @{ request_id = "\${{ github.event.inputs.request_id }}"; status = "running"; phase = "ready"; connection = @{ rustdesk_id = $rid; rustdesk_password = "\${{ github.event.inputs.password }}" } } | ConvertTo-Json -Depth 5
          Invoke-RestMethod -Method Post -Uri "\${{ github.event.inputs.callback_url }}" -Headers @{ "x-hook-signature" = "\${{ github.event.inputs.callback_secret }}" } -ContentType "application/json" -Body $body

      - name: Hold session
        shell: bash
        run: |
          mins=\${{ github.event.inputs.duration_minutes }}
          secs=$((mins*60))
          sleep "$secs"

      - name: Notify expired
        if: success()
        shell: bash
        run: |
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"expired","phase":"expired"}'

      - name: Notify failed
        if: failure()
        shell: bash
        run: |
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"failed","phase":"failed","error":{"code":"WORKFLOW_FAILED","message":"Workflow failed before RustDesk became ready","troubleshooting":["Open the workflow logs from the GitHub Actions run URL","Check RustDesk install/start step","Terminate the session and retry"]}}'
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

async function handleAllowlist(env: Env): Promise<Response> {
  const keys = await env.APP_KV.list({ prefix: "allowlist:" });
  const repos = keys.keys.map((k) => k.name.replace("allowlist:", ""));
  return json({ repos });
}

async function handleCreate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;
  const osRunner = str(body.os_runner) as "ubuntu-latest" | "windows-latest";
  const durationMinutes = Number(body.duration_minutes);
  const username = str(body.username);
  const password = str(body.password);
  const githubToken = str(body.github_token);

  const validation = validateCreateInput(osRunner, durationMinutes, username, password, githubToken, env);
  if (validation) return validation;

  const repoResolve = await resolveTargetRepoFromAllowlist(env, githubToken);
  if (!repoResolve.ok) return repoResolve.response;
  const repo = repoResolve.repo;

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await consumeCreateRateLimit(env, ip))) {
    const active = await env.APP_KV.get(`active:${repo}`, "json") as SessionRecord | null;
    const activeStatus = active ? (await env.APP_KV.get(`status:${active.request_id}`, "json") as SessionRecord | null) : null;
    return jsonError(429, "RATE_LIMITED", "Too many create requests", {
      active_request_id: active?.request_id,
      active_session: activeStatus || active || null
    });
  }

  const activeKey = `active:${repo}`;
  const active = await env.APP_KV.get(activeKey, "json") as SessionRecord | null;
  if (active && ["queued", "running"].includes(active.status)) {
    const activeStatus = await env.APP_KV.get(`status:${active.request_id}`, "json") as SessionRecord | null;
    return jsonError(409, "SESSION_ALREADY_ACTIVE", "An active session already exists", {
      active_request_id: active.request_id,
      active_session: activeStatus || active
    });
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
  osRunner: "ubuntu-latest" | "windows-latest",
  durationMinutes: number,
  username: string,
  password: string,
  githubToken: string,
  env: Env
): Response | null {
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

async function resolveTargetRepoFromAllowlist(env: Env, githubToken: string): Promise<{ ok: true; repo: string } | { ok: false; response: Response }> {
  const keys = await env.APP_KV.list({ prefix: "allowlist:" });
  const repos = keys.keys.map((k) => k.name.replace("allowlist:", ""));
  if (repos.length === 0) {
    return resolveOrCreateUserRepo(env, githubToken);
  }

  for (const repo of repos) {
    const check = await ghGetRepo(repo, githubToken);
    if (check.ok) return { ok: true, repo };
  }

  return resolveOrCreateUserRepo(env, githubToken);
}

async function resolveOrCreateUserRepo(env: Env, githubToken: string): Promise<{ ok: true; repo: string } | { ok: false; response: Response }> {
  const viewer = await ghGetViewer(githubToken);
  if (!viewer.ok) return { ok: false, response: viewer.response };
  const repo = `${viewer.login}/gibrunner`;

  const existing = await ghGetRepo(repo, githubToken);
  if (existing.ok) return { ok: true, repo };

  const templateRepo = env.TEMPLATE_REPO || "EnamTiga/gibrunner";
  const created = await ghGenerateRepoFromTemplate(githubToken, templateRepo, viewer.login, "gibrunner");
  if (!created.ok) return { ok: false, response: created.response };
  return { ok: true, repo };
}

async function handleStatus(url: URL, env: Env): Promise<Response> {
  const requestId = url.searchParams.get("request_id");
  if (!requestId) return jsonError(400, "VALIDATION_ERROR", "request_id is required");
  const record = await env.APP_KV.get(`status:${requestId}`, "json") as SessionRecord | null;
  if (!record) return jsonError(404, "NOT_FOUND", "Session not found");

  const stalledPhases: SessionPhase[] = ["dispatching", "cloning", "provisioning", "rustdesk_starting"];
  const staleMs = Date.now() - new Date(record.updated_at).getTime();
  if (["queued", "running"].includes(record.status) && stalledPhases.includes(record.phase) && staleMs > 10 * 60_000) {
    record.status = "failed";
    record.phase = "failed";
    record.updated_at = new Date().toISOString();
    record.error = {
      code: "WORKFLOW_STALLED",
      message: "Workflow stopped sending progress updates",
      troubleshooting: [
        "Open the GitHub Actions run URL and inspect the failed or hanging step",
        "Terminate this session before creating a new one",
        "Create again so GibRunner updates the workflow file in the target repo"
      ]
    };
    await env.APP_KV.put(`status:${requestId}`, JSON.stringify(record), { expirationTtl: 6 * 3600 });
    await env.APP_KV.delete(`active:${record.repo}`);
  }

  if (["queued", "running"].includes(record.status) && Date.now() > new Date(record.expires_at).getTime()) {
    record.status = "expired";
    record.phase = "expired";
    record.updated_at = new Date().toISOString();
    await env.APP_KV.put(`status:${requestId}`, JSON.stringify(record), { expirationTtl: 6 * 3600 });
    await env.APP_KV.delete(`active:${record.repo}`);
  }

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
  const putUrl = `https://api.github.com/repos/${repo}/contents/${WORKFLOW_FILE}`;
  const content = toBase64(WORKFLOW_CONTENT);

  if (check.status === 200) {
    const existing = (await check.json()) as { sha: string; content?: string };
    const existingContent = (existing.content || "").replace(/\s/g, "");
    if (existingContent === content) return { ok: true };

    const update = await ghApi(putUrl, token, {
      method: "PUT",
      body: JSON.stringify({ message: "Update create-vps workflow", content, branch, sha: existing.sha })
    });
    if (update.status >= 200 && update.status < 300) return { ok: true };
    return { ok: false, response: await toGitHubError(update, "Failed to update workflow file") };
  }
  if (check.status !== 404) return { ok: false, response: await toGitHubError(check, "Failed to check workflow file") };

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

async function ghGetViewer(token: string): Promise<{ ok: true; login: string } | { ok: false; response: Response }> {
  const resp = await ghApi("https://api.github.com/user", token, { method: "GET" });
  if (resp.status >= 200 && resp.status < 300) {
    const data = (await resp.json()) as { login: string };
    return { ok: true, login: data.login };
  }
  return { ok: false, response: await toGitHubError(resp, "Failed to read token user profile") };
}

async function ghGenerateRepoFromTemplate(token: string, templateRepo: string, owner: string, name: string): Promise<{ ok: true } | { ok: false; response: Response }> {
  const resp = await ghApi(`https://api.github.com/repos/${templateRepo}/generate`, token, {
    method: "POST",
    body: JSON.stringify({ owner, name, private: true, include_all_branches: false, description: "GibRunner target repository" })
  });
  if (resp.status >= 200 && resp.status < 300) return { ok: true };
  return { ok: false, response: await toGitHubError(resp, `Failed to generate user repository from template ${templateRepo}`) };
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
