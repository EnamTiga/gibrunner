interface Env {
  APP_KV: KVNamespace;
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
  | "ssh_starting"
  | "ready"
  | "expiring"
  | "failed"
  | "success"
  | "expired"
  | "cancelled";

interface SessionRecord {
  request_id: string;
  repo: string;
  os_runner: "ubuntu-latest";
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
  tmate_ssh?: string;
  tmate_web?: string;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const PUBLIC_VPS_URL = "https://enamtiga.link/tools/gibrunner";

const UI_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GibRunner VPS - Instant SSH Linux Sessions</title>
  <meta name="description" content="Start secure temporary Linux VPS sessions with SSH and web terminal access from your GitHub token. Clean, fast, and browser-friendly." />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="https://enamtiga.link/tools/gibrunner" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="GibRunner VPS - Instant SSH Linux Sessions" />
  <meta property="og:description" content="Launch temporary Linux SSH sessions with a simple web interface and web terminal access." />
  <meta property="og:url" content="https://enamtiga.link/tools/gibrunner" />
  <meta property="og:site_name" content="EnamTiga Tools" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="GibRunner VPS - Instant SSH Linux Sessions" />
  <meta name="twitter:description" content="Launch temporary Linux SSH sessions with a simple web interface and web terminal access." />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"GibRunner VPS","applicationCategory":"DeveloperApplication","operatingSystem":"Linux","url":"https://enamtiga.link/tools/gibrunner","description":"Start secure temporary Linux VPS sessions with SSH and web terminal access."}</script>
  <style>
    :root { --bg:#f5f7fb; --surface:#ffffff; --surface2:#f8fafc; --line:#d9e1ec; --text:#111827; --muted:#5b6575; --soft:#eef4ff; --primary:#1d4ed8; --primary2:#1e40af; --success:#047857; --warning:#b45309; --danger:#b42318; --shadow:0 20px 60px rgba(15,23,42,.08); }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, "Segoe UI", Arial, sans-serif; background:linear-gradient(180deg,#f8fbff 0%,var(--bg) 48%,#eef3f8 100%); color:var(--text); }
    .page { max-width:1120px; margin:0 auto; padding:36px 20px 56px; }
    .topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:28px; }
    .brand { display:flex; align-items:center; gap:12px; }
    .logo { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg,#1d4ed8,#0f766e); color:white; display:grid; place-items:center; font-weight:800; }
    .brand-title { font-size:18px; font-weight:750; letter-spacing:-.02em; }
    .brand-subtitle { color:var(--muted); font-size:13px; margin-top:2px; }
    .badge { border:1px solid var(--line); background:white; color:#334155; border-radius:999px; padding:8px 12px; font-size:13px; font-weight:650; }
    .hero { display:grid; grid-template-columns:minmax(0,1.02fr) minmax(360px,.98fr); gap:24px; align-items:start; }
    .panel { background:rgba(255,255,255,.96); border:1px solid var(--line); border-radius:24px; box-shadow:var(--shadow); overflow:hidden; }
    .panel-body { padding:26px; }
    .eyebrow { color:var(--primary); font-weight:750; font-size:13px; letter-spacing:.04em; text-transform:uppercase; }
    h1 { margin:10px 0 12px; font-size:36px; line-height:1.08; letter-spacing:-.04em; }
    .lead { color:var(--muted); font-size:16px; line-height:1.65; margin:0 0 24px; }
    .checklist { display:grid; gap:12px; margin-top:22px; }
    .check { display:flex; gap:12px; align-items:flex-start; color:#334155; font-size:14px; line-height:1.45; }
    .check span { width:22px; height:22px; flex:0 0 auto; border-radius:50%; display:grid; place-items:center; background:#e0ecff; color:var(--primary); font-size:13px; font-weight:800; }
    .form-grid { display:grid; gap:16px; }
    label { display:block; font-size:13px; font-weight:700; color:#334155; margin-bottom:7px; }
    input,select { width:100%; border:1px solid #cfd8e6; background:#fff; border-radius:12px; padding:12px 13px; font-size:15px; color:var(--text); outline:none; transition:border-color .15s, box-shadow .15s; }
    input:focus,select:focus { border-color:#93b4ff; box-shadow:0 0 0 4px rgba(29,78,216,.10); }
    .input-wrap { position:relative; }
    .input-wrap input { padding-right:92px; }
    .toggle-visibility { position:absolute; right:7px; top:7px; border-radius:9px; padding:7px 10px; background:#eef2f7; color:#334155; font-size:12px; font-weight:800; }
    .field-note { margin-top:6px; color:var(--muted); font-size:12px; line-height:1.45; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .button-row { display:flex; gap:12px; flex-wrap:wrap; margin-top:8px; }
    button { border:0; border-radius:12px; padding:12px 16px; font-size:14px; font-weight:750; cursor:pointer; transition:transform .12s, background .12s, opacity .12s; }
    button:active { transform:translateY(1px); }
    button:disabled { opacity:.55; cursor:not-allowed; transform:none; }
    .btn-primary { background:var(--primary); color:white; min-width:170px; }
    .btn-primary:hover { background:var(--primary2); }
    .btn-secondary { background:#eef2f7; color:#1f2937; }
    .btn-danger { background:#fee4e2; color:var(--danger); }
    .status-panel { margin-top:22px; display:none; }
    .status-head { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; padding-bottom:18px; border-bottom:1px solid var(--line); }
    .status-kicker { color:var(--muted); font-size:13px; font-weight:700; margin-bottom:6px; }
    .status-title { font-size:22px; font-weight:800; letter-spacing:-.02em; }
    .status-meta { color:var(--muted); font-size:13px; margin-top:5px; }
    .live { display:flex; align-items:center; gap:8px; color:var(--success); font-size:13px; font-weight:750; white-space:nowrap; }
    .dot { width:9px; height:9px; background:var(--success); border-radius:50%; box-shadow:0 0 0 6px rgba(4,120,87,.12); }
    .timeline { display:grid; gap:12px; margin-top:20px; }
    .step { display:flex; align-items:flex-start; gap:13px; padding:12px; border:1px solid var(--line); border-radius:14px; background:white; }
    .step-marker { width:28px; height:28px; border-radius:50%; display:grid; place-items:center; background:#eef2f7; color:#64748b; font-size:13px; font-weight:800; flex:0 0 auto; }
    .step.active { border-color:#b8ccff; background:#f7faff; }
    .step.active .step-marker { background:var(--primary); color:white; }
    .step.done .step-marker { background:#dcfce7; color:var(--success); }
    .step-title { font-weight:760; }
    .step-desc { color:var(--muted); font-size:13px; margin-top:3px; line-height:1.45; }
    .notice { margin-top:14px; border-radius:14px; padding:13px 14px; font-size:14px; line-height:1.5; display:none; }
    .notice.info { display:block; background:#eff6ff; color:#1e3a8a; border:1px solid #bfdbfe; }
    .notice.warn { display:block; background:#fffbeb; color:#92400e; border:1px solid #fde68a; }
    .notice.error { display:block; background:#fef3f2; color:#991b1b; border:1px solid #fecaca; }
    .connection { display:none; margin-top:22px; border:1px solid #bbf7d0; background:#f0fdf4; border-radius:18px; padding:18px; }
    .connection h2 { margin:0 0 5px; font-size:19px; }
    .connection p { margin:0 0 16px; color:#166534; font-size:14px; }
    .conn-grid { display:grid; gap:12px; }
    .conn-item { display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; background:white; border:1px solid #bbf7d0; border-radius:14px; padding:12px; }
    .conn-label { color:var(--muted); font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; margin-bottom:5px; }
    .conn-value { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:15px; overflow:auto; }
    .advanced { margin-top:16px; border-top:1px solid var(--line); padding-top:14px; }
    details summary { cursor:pointer; color:#475569; font-size:13px; font-weight:750; }
    .details-grid { display:grid; gap:8px; margin-top:12px; color:#475569; font-size:13px; }
    .details-grid div { display:flex; justify-content:space-between; gap:14px; }
    .toast { position:fixed; right:18px; bottom:18px; width:min(440px,calc(100vw - 36px)); background:#111827; color:white; border-radius:18px; box-shadow:0 22px 70px rgba(0,0,0,.22); padding:18px; display:none; z-index:20; }
    .toast-title { font-weight:800; margin-bottom:5px; }
    .toast-body { color:#d1d5db; font-size:14px; line-height:1.5; margin-bottom:14px; }
    .toast-actions { display:flex; gap:10px; flex-wrap:wrap; }
    .toast button { background:#374151; color:white; }
    .toast .btn-danger { background:#b42318; }
    .inline-link { border:0; padding:0; border-radius:0; background:transparent; color:var(--primary); font-size:12px; font-weight:800; text-decoration:underline; }
    .modal { position:fixed; inset:0; background:rgba(15,23,42,.56); display:none; align-items:center; justify-content:center; padding:18px; z-index:30; }
    .modal.open { display:flex; }
    .modal-card { width:min(560px,100%); background:white; border-radius:22px; box-shadow:0 30px 90px rgba(0,0,0,.28); padding:24px; border:1px solid var(--line); }
    .modal-head { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:10px; }
    .modal-head h2 { margin:0; font-size:22px; letter-spacing:-.02em; }
    .modal-close { background:#eef2f7; color:#334155; padding:9px 12px; }
    .modal-lead { color:var(--muted); line-height:1.55; margin:0 0 16px; }
    .guide-list { margin:0 0 18px; padding-left:22px; color:#334155; line-height:1.65; }
    .guide-link { display:inline-flex; align-items:center; justify-content:center; border-radius:12px; padding:12px 16px; background:var(--primary); color:white; font-weight:800; text-decoration:none; }
    @media (max-width:900px) { .hero { grid-template-columns:1fr; } h1 { font-size:30px; } }
    @media (max-width:620px) { .page { padding:20px 12px 36px; } .topbar,.status-head { flex-direction:column; align-items:flex-start; } .row,.conn-item { grid-template-columns:1fr; } .panel-body { padding:18px; } .button-row { gap:10px; } .button-row button { width:100%; } .input-wrap input { padding-right:86px; } h1 { font-size:28px; } .lead { font-size:15px; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="topbar">
      <div class="brand">
        <div class="logo">GR</div>
        <div><div class="brand-title">GibRunner</div><div class="brand-subtitle">Secure Linux session launcher</div></div>
      </div>
      <div class="badge">Linux only</div>
    </header>

    <section class="hero">
      <div class="panel">
        <div class="panel-body">
          <div class="eyebrow">Remote session</div>
          <h1>Start a ready-to-use Linux session in minutes.</h1>
          <p class="lead">Enter your GitHub token, choose a duration, and GibRunner will prepare SSH access automatically. Typical setup time is 1-3 minutes.</p>
          <div class="checklist">
            <div class="check"><span>1</span><div><strong>Provide access.</strong><br />Use a GitHub token with repository and workflow access.</div></div>
            <div class="check"><span>2</span><div><strong>Wait comfortably.</strong><br />Progress is tracked step by step while the environment is prepared.</div></div>
            <div class="check"><span>3</span><div><strong>Connect.</strong><br />Open the web terminal or copy the SSH command when the session is ready.</div></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-body">
          <div class="eyebrow">Setup</div>
          <div class="form-grid">
            <div>
              <label for="github_token">GitHub token</label>
              <div class="input-wrap">
                <input id="github_token" type="password" autocomplete="off" placeholder="Paste your token" />
                <button class="toggle-visibility" type="button" data-toggle-input="github_token">Show</button>
              </div>
              <div class="field-note">Your token is only used to create and monitor this session. <button id="token_guide_btn" class="inline-link" type="button">How do I create one?</button></div>
            </div>
            <div class="row">
              <div>
                <label for="duration_minutes">Session duration</label>
                <select id="duration_minutes">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120" selected>2 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </div>
              <div>
                <label>Access method</label>
                <input value="SSH + Web Terminal" disabled />
              </div>
            </div>
            <div class="button-row">
              <button id="create_btn" class="btn-primary" type="button">Start session</button>
              <button id="terminate_btn" class="btn-danger" type="button" disabled>Terminate</button>
            </div>
            <div id="notice" class="notice"></div>
          </div>
        </div>
      </div>
    </section>

    <section id="status_panel" class="panel status-panel">
      <div class="panel-body">
        <div class="status-head">
          <div>
            <div class="status-kicker">Current session</div>
            <div id="status_title" class="status-title">Preparing your session</div>
            <div id="status_meta" class="status-meta">Waiting for the first update...</div>
          </div>
          <div class="live"><span class="dot"></span><span id="live_text">Live updates</span></div>
        </div>
        <div class="timeline">
          <div id="step_validate" class="step"><div class="step-marker">1</div><div><div class="step-title">Validating access</div><div class="step-desc">Checking token access and preparing the target repository.</div></div></div>
          <div id="step_prepare" class="step"><div class="step-marker">2</div><div><div class="step-title">Preparing environment</div><div class="step-desc">Starting the Linux runner and installing required services.</div></div></div>
          <div id="step_connect" class="step"><div class="step-marker">3</div><div><div class="step-title">Starting SSH access</div><div class="step-desc">Launching the secure terminal tunnel and collecting connection details.</div></div></div>
          <div id="step_ready" class="step"><div class="step-marker">4</div><div><div class="step-title">Session ready</div><div class="step-desc">Open the web terminal or copy the SSH command to begin.</div></div></div>
        </div>
        <div id="wait_notice" class="notice info">Setup can take a few minutes. You can leave this page open; progress will resume automatically after refresh.</div>
        <div class="advanced">
          <details>
            <summary>Advanced session details</summary>
            <div class="details-grid">
              <div><span>Repository</span><strong id="detail_repo">-</strong></div>
              <div><span>Expires</span><strong id="detail_expires">-</strong></div>
              <div><span>Last update</span><strong id="detail_updated">-</strong></div>
              <div><span>Workflow</span><strong id="detail_workflow">-</strong></div>
            </div>
          </details>
        </div>
      </div>
    </section>

    <section id="connection_box" class="connection">
      <h2>Your session is ready</h2>
      <p>Use SSH or the web terminal to access the prepared Linux session.</p>
      <div class="conn-grid">
        <div class="conn-item"><div><div class="conn-label">SSH access</div><div id="conn_tmate_ssh" class="conn-value">-</div></div><button class="btn-secondary copy-btn" data-copy="conn_tmate_ssh">Copy SSH</button></div>
        <div class="conn-item"><div><div class="conn-label">Web terminal</div><div id="conn_tmate_web" class="conn-value">-</div></div><button class="btn-secondary copy-btn" data-copy="conn_tmate_web">Copy link</button></div>
      </div>
    </section>

    <div id="token_guide_modal" class="modal" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="token_guide_title">
        <div class="modal-head"><h2 id="token_guide_title">Create a GitHub token</h2><button id="token_guide_close" class="modal-close" type="button">Close</button></div>
        <p class="modal-lead">Create a classic GitHub token with the permissions needed to install and run the workflow.</p>
        <ol class="guide-list">
          <li>Open the GitHub token creation page.</li>
          <li>Set an expiration that matches your usage.</li>
          <li>Select the scopes <strong>repo</strong> and <strong>workflow</strong>.</li>
          <li>Generate the token and paste it into GibRunner.</li>
        </ol>
        <a class="guide-link" href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=GibRunner%20session%20token" target="_blank" rel="noopener">Open GitHub token page</a>
      </div>
    </div>
  </main>

  <div id="active_session_toast" class="toast">
    <div class="toast-title">Existing session found</div>
    <div id="active_session_toast_body" class="toast-body"></div>
    <div class="toast-actions"><button id="toast_watch_btn" type="button">Watch progress</button><button id="toast_terminate_btn" class="btn-danger" type="button">Terminate</button></div>
  </div>

<script>
const storageKey = 'gibrunner.currentRequestId';
const startedKey = 'gibrunner.currentStartedAt';
const API_BASE = location.pathname.startsWith('/vps') ? '/vps/api/v1' : '/api/v1';
let currentRequestId = '';
let activePollRequestId = '';
let currentStartedAt = 0;

function el(id){ return document.getElementById(id); }
function setText(id, value){ el(id).textContent = value || '-'; }
function setNotice(type, message){ const n = el('notice'); n.className = 'notice ' + type; n.textContent = message; }
function clearNotice(){ const n = el('notice'); n.className = 'notice'; n.textContent = ''; }
function phaseStep(phase){ if(['queued','validating','dispatching'].includes(phase)) return 1; if(['cloning','provisioning'].includes(phase)) return 2; if(phase === 'ssh_starting') return 3; if(phase === 'ready') return 4; return 1; }
function userTitle(session){ if(session.status === 'failed') return 'Setup could not be completed'; if(session.status === 'expired') return 'Session expired'; if(session.status === 'cancelled') return 'Session terminated'; if(session.phase === 'ready') return 'Session ready'; if(session.phase === 'ssh_starting') return 'Starting SSH access'; if(['cloning','provisioning'].includes(session.phase)) return 'Preparing environment'; return 'Validating access'; }
function setButtons(isRunning){ el('create_btn').disabled = isRunning; el('terminate_btn').disabled = !currentRequestId || !isRunning; }
function updateSteps(step, terminalFailed){ ['validate','prepare','connect','ready'].forEach(function(name, index){ const node = el('step_' + name); node.className = 'step'; if(index + 1 < step) node.classList.add('done'); if(index + 1 === step) node.classList.add(terminalFailed ? 'error' : 'active'); }); }
function renderStatus(session){
  el('status_panel').style.display = 'block';
  const step = phaseStep(session.phase);
  updateSteps(step, session.status === 'failed');
  setText('status_title', userTitle(session));
  const elapsed = currentStartedAt ? Math.floor((Date.now() - currentStartedAt) / 1000) : 0;
  const suffix = elapsed > 0 ? 'Elapsed ' + Math.floor(elapsed / 60) + 'm ' + (elapsed % 60) + 's' : 'Live progress';
  setText('status_meta', suffix + ' · Last checked ' + new Date().toLocaleTimeString());
  setText('detail_repo', session.repo || '-');
  setText('detail_expires', session.expires_at ? new Date(session.expires_at).toLocaleString() : '-');
  setText('detail_updated', session.updated_at ? new Date(session.updated_at).toLocaleTimeString() : '-');
  el('detail_workflow').innerHTML = session.workflow_url ? '<a href="' + session.workflow_url + '" target="_blank" rel="noopener">Open run</a>' : '-';
  if(elapsed > 90 && session.phase !== 'ready') { const w = el('wait_notice'); w.className = 'notice warn'; w.textContent = 'This is taking longer than usual, but the runner is still working. You can keep this page open or come back later.'; }
  setButtons(['queued','running'].includes(session.status));
}
function renderConnection(conn){
  if(!conn) return;
  el('connection_box').style.display = 'block';
  setText('conn_tmate_ssh', conn.tmate_ssh || '-');
  setText('conn_tmate_web', conn.tmate_web || '-');
}
async function poll(reqId){
  currentRequestId = reqId; activePollRequestId = reqId; localStorage.setItem(storageKey, reqId); if(!currentStartedAt){ currentStartedAt = Date.now(); localStorage.setItem(startedKey, String(currentStartedAt)); }
  let shownConnection = false;
  while(activePollRequestId === reqId){
    const r = await fetch(API_BASE + '/session/status?request_id=' + encodeURIComponent(reqId));
    const j = await r.json();
    if(r.ok) renderStatus(j);
    if(r.ok && (j.phase === 'ready' || j.status === 'success') && !shownConnection){ const c = await fetch(API_BASE + '/session/connection?request_id=' + encodeURIComponent(reqId)); const cj = await c.json(); if(c.ok){ renderConnection(cj.connection); shownConnection = true; setNotice('info','Your session is ready. Copy the connection details below.'); } }
    if(['success','failed','expired','cancelled'].includes(j.status)){ if(j.status === 'failed') setNotice('error', j.error?.message || 'The session could not be prepared.'); localStorage.removeItem(storageKey); localStorage.removeItem(startedKey); setButtons(false); break; }
    await new Promise(function(resolve){ setTimeout(resolve, 4000); });
  }
}
async function createSession(){
  clearNotice();
  const token = el('github_token').value.trim();
  if(!token){ setNotice('error','Please enter your GitHub token.'); return; }
  setButtons(true); el('connection_box').style.display = 'none'; currentStartedAt = Date.now(); localStorage.setItem(startedKey, String(currentStartedAt)); setNotice('info','Starting your session. This usually takes 2-6 minutes.');
  const body = { os_runner:'ubuntu-latest', duration_minutes:Number(el('duration_minutes').value), github_token:token };
  const r = await fetch(API_BASE + '/session/create', { method:'POST', headers:{ 'content-type':'application/json', 'x-idempotency-key':crypto.randomUUID() }, body:JSON.stringify(body) });
  const j = await r.json();
  if(!r.ok){ setButtons(false); if((r.status === 409 && j?.error?.details?.active_request_id) || (r.status === 429 && j?.error?.details?.active_request_id)){ currentRequestId = j.error.details.active_request_id; el('active_session_toast_body').textContent = 'A session is already running. You can watch the existing progress or terminate it.'; el('active_session_toast').style.display = 'block'; return; } setNotice('error', j?.error?.message || 'Unable to start the session.'); return; }
  currentRequestId = j.request_id; poll(j.request_id);
}
async function terminateCurrentSession(){ if(!currentRequestId){ setNotice('error','There is no active session to terminate.'); return; } const r = await fetch(API_BASE + '/session/cancel', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ request_id:currentRequestId, github_token:el('github_token').value.trim() }) }); const j = await r.json(); if(!r.ok){ setNotice('error', j?.error?.message || 'Unable to terminate the session.'); return; } activePollRequestId = ''; localStorage.removeItem(storageKey); localStorage.removeItem(startedKey); setButtons(false); setNotice('info','Session terminated.'); }
document.querySelectorAll('[data-copy]').forEach(function(btn){ btn.addEventListener('click', async function(){ const id = btn.getAttribute('data-copy'); const text = el(id).textContent || ''; if(text && text !== '-'){ await navigator.clipboard.writeText(text); const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = old; }, 1200); } }); });
document.querySelectorAll('[data-toggle-input]').forEach(function(btn){ btn.addEventListener('click', function(){ const input = el(btn.getAttribute('data-toggle-input')); const visible = input.type === 'text'; input.type = visible ? 'password' : 'text'; btn.textContent = visible ? 'Show' : 'Hide'; }); });
el('create_btn').addEventListener('click', createSession); el('terminate_btn').addEventListener('click', terminateCurrentSession); el('toast_terminate_btn').addEventListener('click', terminateCurrentSession); el('toast_watch_btn').addEventListener('click', function(){ el('active_session_toast').style.display = 'none'; if(currentRequestId) poll(currentRequestId); });
el('token_guide_btn').addEventListener('click', function(){ el('token_guide_modal').classList.add('open'); });
el('token_guide_close').addEventListener('click', function(){ el('token_guide_modal').classList.remove('open'); });
el('token_guide_modal').addEventListener('click', function(event){ if(event.target === el('token_guide_modal')) el('token_guide_modal').classList.remove('open'); });
const restoredRequestId = localStorage.getItem(storageKey); if(restoredRequestId){ currentStartedAt = Number(localStorage.getItem(startedKey) || Date.now()); setNotice('info','Restored your previous session. Checking the latest progress now.'); poll(restoredRequestId); }
</script>
</body>
</html>`;

const UBUNTU_WORKFLOW_FILE = `.github/workflows/create-ubuntu.yml`;

function createWorkflowContent(workflowName: string, runsOn: string): string {
  return `name: ${workflowName}
run-name: ${workflowName}-\${{ github.event.inputs.request_id }}

on:
  workflow_dispatch:
    inputs:
      request_id:
        required: true
      duration_minutes:
        required: true
      callback_url:
        required: true
      callback_secret:
        required: true

jobs:
  run:
    runs-on: ${runsOn}
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

      - name: Notify SSH starting
        shell: bash
        run: |
          curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"running","phase":"ssh_starting"}'

      - name: Setup Linux user and SSH tunnel
        if: runner.os == 'Linux'
        timeout-minutes: 6
        shell: bash
        run: |
          set -euo pipefail
          fail() {
            line_no="$1"
            payload=$(jq -cn --arg req "\${{ github.event.inputs.request_id }}" --arg ln "$line_no" '{request_id:$req,status:"failed",phase:"failed",error:{code:"SSH_SETUP_FAILED",message:("SSH setup failed near line " + $ln),troubleshooting:["Open workflow logs","Check tmate setup step","Retry session"]}}')
            curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
              -H "content-type: application/json" \\
              -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
              -d "$payload" || true
          }
          trap 'fail "$LINENO"' ERR
          sudo apt-get update
          sudo apt-get install -y curl ca-certificates jq tmate
          tmate -S /tmp/tmate.sock new-session -d
          tmate -S /tmp/tmate.sock wait tmate-ready
          sleep 2

      - name: Get SSH info and notify ready
        if: runner.os == 'Linux'
        shell: bash
        run: |
          TMATE_SSH=""
          TMATE_WEB=""
          if command -v tmate >/dev/null 2>&1; then
            TMATE_SSH=$(tmate -S /tmp/tmate.sock display -p '#{tmate_ssh}' 2>/dev/null || true)
            TMATE_WEB=$(tmate -S /tmp/tmate.sock display -p '#{tmate_web}' 2>/dev/null || true)
          fi
          if [ -z "$TMATE_SSH" ] && [ -z "$TMATE_WEB" ]; then
            curl -sS -X POST "\${{ github.event.inputs.callback_url }}" \\
              -H "content-type: application/json" \\
              -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
              -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"failed","phase":"failed","error":{"code":"SSH_LINK_MISSING","message":"SSH access could not be created","troubleshooting":["Open the GitHub Actions log for tmate output","Retry after terminating this session"]}}'
            exit 42
          fi
          payload=$(jq -cn --arg req "\${{ github.event.inputs.request_id }}" --arg ssh "$TMATE_SSH" --arg web "$TMATE_WEB" '{request_id:$req,status:"running",phase:"ready",connection:{tmate_ssh:$ssh,tmate_web:$web}}')
          curl -fsS -X POST "\${{ github.event.inputs.callback_url }}" \\
            -H "content-type: application/json" \\
            -H "x-hook-signature: \${{ github.event.inputs.callback_secret }}" \\
            -d "$payload"

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
            -d '{"request_id":"\${{ github.event.inputs.request_id }}","status":"failed","phase":"failed","error":{"code":"WORKFLOW_FAILED","message":"Workflow failed before SSH access became ready","troubleshooting":["Open the workflow logs from the GitHub Actions run URL","Check tmate setup step","Terminate the session and retry"]}}'
`;
}

const UBUNTU_WORKFLOW_CONTENT = createWorkflowContent("create-ubuntu", "ubuntu-latest");

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/robots.txt") {
      return new Response(`User-agent: *\nAllow: /tools/gibrunner\nSitemap: https://enamtiga.link/tools/gibrunner/sitemap.xml\n`, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    if (request.method === "GET" && url.pathname === "/sitemap.xml") {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${PUBLIC_VPS_URL}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n</urlset>\n`, { headers: { "content-type": "application/xml; charset=utf-8" } });
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/tools/gibrunner" ||
        url.pathname === "/tools/gibrunner/" ||
        url.pathname === "/tools/gibrunner/vps" ||
        url.pathname === "/tools/gibrunner/vps/")
    ) {
      return new Response(UI_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    const basePath = "/tools/gibrunner";
    const normalizedPath = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) || "/" : url.pathname;
    const apiPath = normalizedPath.startsWith("/vps/api/v1/") ? normalizedPath.slice(4) : normalizedPath;

    if (!apiPath.startsWith("/api/v1/")) {
      return jsonError(404, "NOT_FOUND", "Route not found");
    }

    if (request.method === "GET" && apiPath === "/api/v1/allowlist/repos") {
      return handleAllowlist(env);
    }

    if (request.method === "POST" && apiPath === "/api/v1/session/create") {
      return handleCreate(request, env);
    }

    if (request.method === "GET" && apiPath === "/api/v1/session/status") {
      return handleStatus(url, env);
    }

    if (request.method === "GET" && apiPath === "/api/v1/session/connection") {
      return handleConnection(url, env);
    }

    if (request.method === "POST" && apiPath === "/api/v1/session/cancel") {
      return handleCancel(request, env);
    }

    if (request.method === "POST" && apiPath === "/api/v1/session/logs") {
      return handleLogs(request, env);
    }

    if (request.method === "POST" && apiPath === "/api/v1/webhook/github") {
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
  const osRunner = str(body.os_runner) as "ubuntu-latest";
  const durationMinutes = Number(body.duration_minutes);
  const githubToken = str(body.github_token);

  const validation = validateCreateInput(osRunner, durationMinutes, githubToken, env);
  if (validation) return validation;

  const repoResolve = await resolveTargetRepoFromAllowlist(env, githubToken);
  if (!repoResolve.ok) return repoResolve.response;
  const repo = repoResolve.repo;

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await consumeCreateRateLimit(env, ip))) {
    const active = await env.APP_KV.get(`active:${repo}`, "json") as SessionRecord | null;
    const activeStatus = active ? (await env.APP_KV.get(`status:${active.request_id}`, "json") as SessionRecord | null) : null;
    if (active) await storeSessionToken(env, active.request_id, githubToken, active.duration_minutes * 60 + 900);
    return jsonError(429, "RATE_LIMITED", "Too many create requests", {
      active_request_id: active?.request_id,
      active_session: activeStatus || active || null
    });
  }

  const activeKey = `active:${repo}`;
  const active = await env.APP_KV.get(activeKey, "json") as SessionRecord | null;
  if (active && ["queued", "running"].includes(active.status)) {
    const activeStatus = await env.APP_KV.get(`status:${active.request_id}`, "json") as SessionRecord | null;
    await storeSessionToken(env, active.request_id, githubToken, active.duration_minutes * 60 + 900);
    return jsonError(409, "SESSION_ALREADY_ACTIVE", "An active session already exists", {
      active_request_id: active.request_id,
      active_session: activeStatus || active
    });
  }

  const repoMeta = await ghGetRepo(repo, githubToken);
  if (!repoMeta.ok) return repoMeta.response;
  if (!repoMeta.data.can_push) {
    return jsonError(403, "REPO_NOT_WRITABLE", "Token can read target repo but cannot write workflow files", {
      repo,
      troubleshooting: [
        "Use a token with write access to the selected repo",
        "Update allowlist to include a repo where this token has push access",
        "Or remove allowlist entries so GibRunner uses your own gibrunner repo"
      ]
    });
  }

  const requestId = `req_${crypto.randomUUID()}`;
  const now = new Date();
  const expires = new Date(now.getTime() + durationMinutes * 60_000);
  const requestUrl = new URL(request.url);
  const apiPrefix = requestUrl.pathname.startsWith("/vps/") ? "/vps/api/v1" : "/api/v1";
  const runPayload = {
    ref: repoMeta.data.default_branch,
    inputs: {
      request_id: requestId,
      duration_minutes: String(durationMinutes),
      callback_url: `${requestUrl.origin}${apiPrefix}/webhook/github`,
      callback_secret: env.WEBHOOK_SECRET
    }
  };

  const workflowReady = await ensureWorkflowFiles(repo, repoMeta.data.default_branch, githubToken);
  if (!workflowReady.ok) return workflowReady.response;

  const workflowFile = UBUNTU_WORKFLOW_FILE;
  const dispatch = await ghDispatchWorkflow(repo, workflowFile, githubToken, runPayload);
  if (!dispatch.ok) return dispatch.response;

  const runInfo = await ghFindLatestRun(repo, workflowFile, githubToken, requestId);
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
  await storeSessionToken(env, requestId, githubToken, durationMinutes * 60 + 900);

  return json(record, 202);
}

function validateCreateInput(
  osRunner: "ubuntu-latest",
  durationMinutes: number,
  githubToken: string,
  env: Env
): Response | null {
  if (osRunner !== "ubuntu-latest") return jsonError(400, "VALIDATION_ERROR", "Unsupported os_runner (linux only)");
  const max = Number(env.MAX_SESSION_MINUTES || "240");
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > max) {
    return jsonError(400, "VALIDATION_ERROR", `duration_minutes must be 15..${max}`);
  }
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
    if (check.ok && check.data.can_push) return { ok: true, repo };
  }

  return resolveOrCreateUserRepo(env, githubToken);
}

async function resolveOrCreateUserRepo(_env: Env, githubToken: string): Promise<{ ok: true; repo: string } | { ok: false; response: Response }> {
  const viewer = await ghGetViewer(githubToken);
  if (!viewer.ok) return { ok: false, response: viewer.response };
  const repo = `${viewer.login}/gibrunner`;

  const existing = await ghGetRepo(repo, githubToken);
  if (existing.ok) return { ok: true, repo };

  const created = await ghCreateRepo(githubToken, "gibrunner");
  if (!created.ok) return { ok: false, response: created.response };
  return { ok: true, repo };
}

async function handleStatus(url: URL, env: Env): Promise<Response> {
  const requestId = url.searchParams.get("request_id");
  if (!requestId) return jsonError(400, "VALIDATION_ERROR", "request_id is required");
  const record = await env.APP_KV.get(`status:${requestId}`, "json") as SessionRecord | null;
  if (!record) return jsonError(404, "NOT_FOUND", "Session not found");

  const stalledPhases: SessionPhase[] = ["dispatching", "cloning", "provisioning", "ssh_starting"];
  const staleMs = Date.now() - new Date(record.updated_at).getTime();
  const staleThresholdMs = Math.max(600, Number(env.STATUS_STALE_SECONDS || "600")) * 1000;
  if (["queued", "running"].includes(record.status) && stalledPhases.includes(record.phase) && staleMs > staleThresholdMs) {
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
  if (!requestId) return jsonError(400, "VALIDATION_ERROR", "request_id is required");
  const rec = await env.APP_KV.get(`status:${requestId}`, "json") as SessionRecord | null;
  if (!rec) return jsonError(404, "NOT_FOUND", "Session not found");
  const tokenResult = await resolveSessionToken(env, requestId, str(body.github_token));
  if (!tokenResult.ok) return tokenResult.response;

  if (rec.run_id) {
    const cancel = await ghCancelRun(rec.repo, rec.run_id, tokenResult.token);
    if (!cancel.ok) return cancel.response;
  }

  rec.status = "cancelled";
  rec.phase = "cancelled";
  rec.updated_at = new Date().toISOString();
  await env.APP_KV.put(`status:${requestId}`, JSON.stringify(rec), { expirationTtl: 6 * 3600 });
  await env.APP_KV.delete(`active:${rec.repo}`);
  return json({ request_id: requestId, status: "cancelled" });
}

async function handleLogs(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;
  const requestId = str(body.request_id);
  if (!requestId) return jsonError(400, "VALIDATION_ERROR", "request_id is required");

  const rec = await env.APP_KV.get(`status:${requestId}`, "json") as SessionRecord | null;
  if (!rec) return jsonError(404, "NOT_FOUND", "Session not found");
  if (!rec.run_id) return jsonError(409, "RUN_ID_MISSING", "GitHub run_id is not available yet");
  const tokenResult = await resolveSessionToken(env, requestId, str(body.github_token));
  if (!tokenResult.ok) return tokenResult.response;

  const jobs = await ghGetRunJobs(rec.repo, rec.run_id, tokenResult.token);
  if (!jobs.ok) return jobs.response;
  return json({
    request_id: requestId,
    repo: rec.repo,
    run_id: rec.run_id,
    workflow_url: rec.workflow_url,
    jobs: jobs.data
  });
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
  const nextError = body.error?.code === "WORKFLOW_FAILED" && existing.error ? existing.error : (body.error || existing.error);

  const next: SessionRecord = {
    ...existing,
    status: body.status || existing.status,
    phase: body.phase || existing.phase,
    updated_at: new Date().toISOString(),
    error: nextError
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

async function ensureWorkflowFiles(repo: string, branch: string, token: string): Promise<{ ok: true } | { ok: false; response: Response }> {
  return ensureWorkflowFile(repo, branch, token, UBUNTU_WORKFLOW_FILE, UBUNTU_WORKFLOW_CONTENT);
}

async function ensureWorkflowFile(repo: string, branch: string, token: string, workflowFile: string, workflowContent: string): Promise<{ ok: true } | { ok: false; response: Response }> {
  const checkUrl = `https://api.github.com/repos/${repo}/contents/${workflowFile}?ref=${encodeURIComponent(branch)}`;
  const check = await ghApi(checkUrl, token, { method: "GET" });
  const putUrl = `https://api.github.com/repos/${repo}/contents/${workflowFile}`;
  const content = toBase64(workflowContent);
  const workflowName = workflowFile.split("/").pop() || workflowFile;

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

  const existingWorkflow = await ghApi(`https://api.github.com/repos/${repo}/actions/workflows/${workflowName}`, token, { method: "GET" });
  if (existingWorkflow.status >= 200 && existingWorkflow.status < 300) return { ok: true };
  if (existingWorkflow.status !== 404) {
    return { ok: false, response: await toGitHubError(existingWorkflow, "Failed to check workflow registration") };
  }

  const put = await ghApi(putUrl, token, {
    method: "PUT",
    body: JSON.stringify({ message: `Add ${workflowFile}`, content, branch })
  });
  if (put.status >= 200 && put.status < 300) return { ok: true };
  if (put.status === 404 || put.status === 403) {
    return {
      ok: false,
      response: jsonError(502, "GITHUB_API_ERROR", "Token cannot create workflow files in target repo", {
        github_status: put.status,
        troubleshooting: [
          "Use a token with repo and workflow scopes",
          "Grant repository Contents read/write permission",
          "Ensure token can access the target repository"
        ]
      })
    };
  }
  return { ok: false, response: await toGitHubError(put, "Failed to install workflow file") };
}

async function ghGetRepo(repo: string, token: string): Promise<{ ok: true; data: { default_branch: string; can_push: boolean } } | { ok: false; response: Response }> {
  const resp = await ghApi(`https://api.github.com/repos/${repo}`, token, { method: "GET" });
  if (resp.status >= 200 && resp.status < 300) {
    const data = (await resp.json()) as { default_branch: string; permissions?: { push?: boolean; admin?: boolean; maintain?: boolean } };
    const canPush = Boolean(data.permissions?.push || data.permissions?.admin || data.permissions?.maintain);
    return { ok: true, data: { default_branch: data.default_branch, can_push: canPush } };
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

async function ghCreateRepo(token: string, name: string): Promise<{ ok: true } | { ok: false; response: Response }> {
  const resp = await ghApi("https://api.github.com/user/repos", token, {
    method: "POST",
    body: JSON.stringify({ name, private: true, auto_init: true, description: "GibRunner workflow repository" })
  });
  if (resp.status >= 200 && resp.status < 300) return { ok: true };
  return { ok: false, response: await toGitHubError(resp, "Failed to create user repository gibrunner") };
}

async function ghDispatchWorkflow(repo: string, workflowFile: string, token: string, payload: Record<string, unknown>): Promise<{ ok: true } | { ok: false; response: Response }> {
  const workflowName = workflowFile.split("/").pop();
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflowName}/dispatches`;
  let lastResp: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const resp = await ghApi(url, token, { method: "POST", body: JSON.stringify(payload) });
    if (resp.status === 204) return { ok: true };
    lastResp = resp;
    if (resp.status !== 404) break;
    await delay(1500 * (attempt + 1));
  }
  return { ok: false, response: await toGitHubError(lastResp as Response, "Failed to dispatch workflow") };
}

async function ghFindLatestRun(repo: string, workflowFile: string, token: string, requestId: string): Promise<{ ok: true; data: { id: number } } | { ok: false }> {
  const workflowName = workflowFile.split("/").pop();
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflowName}/runs?per_page=5`;
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

async function ghGetRunJobs(repo: string, runId: number, token: string): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  const url = `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs?per_page=100`;
  const resp = await ghApi(url, token, { method: "GET" });
  if (resp.status >= 200 && resp.status < 300) {
    const data = (await resp.json()) as {
      jobs?: Array<{
        name: string;
        status: string;
        conclusion: string | null;
        html_url: string;
        started_at: string | null;
        completed_at: string | null;
        steps?: Array<{
          number: number;
          name: string;
          status: string;
          conclusion: string | null;
          started_at: string | null;
          completed_at: string | null;
        }>;
      }>;
    };
    return {
      ok: true,
      data: (data.jobs || []).map((job) => ({
        name: job.name,
        status: job.status,
        conclusion: job.conclusion,
        html_url: job.html_url,
        started_at: job.started_at,
        completed_at: job.completed_at,
        failed_steps: (job.steps || []).filter((step) => step.conclusion === "failure"),
        steps: job.steps || []
      }))
    };
  }
  return { ok: false, response: await toGitHubError(resp, "Failed to fetch workflow jobs") };
}

async function storeSessionToken(env: Env, requestId: string, token: string, ttlSeconds: number): Promise<void> {
  const encrypted = await encryptSecret(env, token);
  await env.APP_KV.put(`token:${requestId}`, encrypted, { expirationTtl: Math.max(900, ttlSeconds) });
}

async function resolveSessionToken(env: Env, requestId: string, providedToken: string): Promise<{ ok: true; token: string } | { ok: false; response: Response }> {
  if (providedToken) return { ok: true, token: providedToken };

  const encrypted = await env.APP_KV.get(`token:${requestId}`);
  if (!encrypted) {
    return {
      ok: false,
      response: jsonError(401, "TOKEN_NOT_STORED", "Stored GitHub token is not available for this session. Re-enter token and try again.")
    };
  }

  try {
    return { ok: true, token: await decryptSecret(env, encrypted) };
  } catch {
    return { ok: false, response: jsonError(500, "TOKEN_DECRYPT_FAILED", "Stored GitHub token could not be decrypted") };
  }
}

async function getSecretKey(env: Env): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.WEBHOOK_SECRET));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSecret(env: Env, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getSecretKey(env);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`;
}

async function decryptSecret(env: Env, encrypted: string): Promise<string> {
  const [ivPart, cipherPart] = encrypted.split(".");
  if (!ivPart || !cipherPart) throw new Error("Invalid encrypted secret format");
  const key = await getSecretKey(env);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToArrayBuffer(ivPart) }, key, base64ToArrayBuffer(cipherPart));
  return new TextDecoder().decode(plaintext);
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function toGitHubError(resp: Response, fallbackMessage: string): Promise<Response> {
  let message = fallbackMessage;
  let details: unknown;
  try {
    const j = (await resp.json()) as { message?: string; errors?: unknown };
    message = j.message ? `${fallbackMessage}: ${j.message}` : fallbackMessage;
    details = { github_errors: j.errors };
  } catch {
    message = fallbackMessage;
  }
  return jsonError(resp.status === 401 ? 403 : 502, "GITHUB_API_ERROR", message, { github_status: resp.status, details });
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToArrayBuffer(input: string): ArrayBuffer {
  const binary = atob(input);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function jsonError(status: number, code: string, message: string, details?: unknown): Response {
  return json({ error: { code, message, details } }, status);
}
