/* global surfer */
'use strict';

// ── River Canvas ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('river-canvas');
const ctx    = canvas.getContext('2d');
let W, H, t = 0;

function resize() {
  W = canvas.width  = canvas.offsetWidth;
  H = canvas.height = canvas.offsetHeight;
}
resize();
window.addEventListener('resize', resize);

function drawRiver() {
  ctx.clearRect(0, 0, W, H);

  // Sky-water gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#06101a');
  bg.addColorStop(0.4, '#0a1628');
  bg.addColorStop(1, '#0d2240');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ink-wash horizon mist
  const mist = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  mist.addColorStop(0, 'rgba(180,210,230,0.07)');
  mist.addColorStop(1, 'rgba(180,210,230,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, W, H * 0.4);

  // Wave layers
  drawWaveLayer(0.6, 0.38, 0.003, 'rgba(26,64,96,0.5)',  18);
  drawWaveLayer(0.7, 0.55, 0.005, 'rgba(13,50,80,0.6)',  22);
  drawWaveLayer(0.8, 0.70, 0.008, 'rgba(10,35,60,0.7)',  28);
  drawWaveLayer(0.9, 0.82, 0.012, 'rgba(8,25,45,0.8)',   34);
  drawFoamEdge(0.92, 'rgba(200,220,235,0.25)', 1.5);
  drawFoamEdge(0.96, 'rgba(200,220,235,0.15)', 1);

  // Moon reflection streak
  const mx = W * 0.72;
  const refl = ctx.createLinearGradient(mx - 40, 0, mx + 40, 0);
  refl.addColorStop(0, 'transparent');
  refl.addColorStop(0.5, 'rgba(201,169,110,0.08)');
  refl.addColorStop(1, 'transparent');
  ctx.fillStyle = refl;
  ctx.fillRect(mx - 40, H * 0.3, 80, H * 0.7);

  // Ink brush birds
  drawBirds();

  t += 0.008;
  requestAnimationFrame(drawRiver);
}

function drawWaveLayer(yFrac, amp, speed, color, pts) {
  ctx.beginPath();
  const y0 = H * yFrac;
  const a  = H * (1 - amp) * 0.06;
  ctx.moveTo(0, H);
  for (let i = 0; i <= pts; i++) {
    const x = (i / pts) * W;
    const y = y0 + Math.sin(i * 0.6 + t * (speed * 1000)) * a
                 + Math.sin(i * 1.3 + t * (speed * 700) + 1) * a * 0.4;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawFoamEdge(yFrac, color, lw) {
  const y0 = H * yFrac;
  const a  = H * 0.012;
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const x = (i / 60) * W;
    const y = y0 + Math.sin(i * 0.8 + t * 6) * a + Math.sin(i * 1.7 + t * 4) * a * 0.3;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function drawBirds() {
  const birds = [
    { bx: 0.15, by: 0.12, phase: 0 },
    { bx: 0.22, by: 0.08, phase: 1 },
    { bx: 0.60, by: 0.15, phase: 2 },
    { bx: 0.65, by: 0.10, phase: 0.5 },
    { bx: 0.68, by: 0.18, phase: 1.5 },
  ];
  ctx.strokeStyle = 'rgba(180,210,230,0.5)';
  ctx.lineWidth = 1.2;
  birds.forEach(({ bx, by, phase }) => {
    const x = W * bx + Math.sin(t * 0.4 + phase) * 8;
    const y = H * by + Math.sin(t * 0.6 + phase) * 3;
    const s = 8;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x, y - s * 0.5, x + s, y);
    ctx.stroke();
  });
}

drawRiver();

// ── Navigation ────────────────────────────────────────────────────────────────
const urlInput   = document.getElementById('url-input');
const loadingBar = document.getElementById('loading-bar');
const lockIcon   = document.getElementById('lock-icon');
const pageTitle  = document.getElementById('page-title');
const blockedBadge = document.getElementById('blocked-badge');

function navigate() {
  const val = urlInput.value.trim();
  if (!val) return;
  surfer.navigate(val).then(url => { urlInput.value = url; urlInput.blur(); });
}

urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });
document.getElementById('btn-back').addEventListener('click', () => surfer.goBack());
document.getElementById('btn-fwd').addEventListener('click',  () => surfer.goForward());
document.getElementById('btn-reload').addEventListener('click', () => surfer.reload());
document.getElementById('btn-home').addEventListener('click', () => surfer.goHome());

surfer.on('nav-update', ({ url, canGoBack, canGoFwd }) => {
  urlInput.value = url;
  lockIcon.style.opacity = url.startsWith('https') ? '0.8' : '0.3';
  document.getElementById('btn-back').disabled = !canGoBack;
  document.getElementById('btn-fwd').disabled  = !canGoFwd;
  checkBookmarkState(url);
});

surfer.on('title-update', t => { pageTitle.textContent = t; document.title = t || 'Surfer'; });

surfer.on('loading', isLoading => {
  loadingBar.classList.toggle('active', isLoading);
  if (!isLoading) setTimeout(() => loadingBar.classList.remove('active'), 500);
});

surfer.on('open-panel', name => openPanel(name));

surfer.on('tracker-blocked', count => {
  blockedBadge.textContent = `🛡 ${count}`;
  blockedBadge.classList.add('bump');
  setTimeout(() => blockedBadge.classList.remove('bump'), 300);
});

// ── River History Entries ─────────────────────────────────────────────────────
const riverEntries = document.getElementById('river-entries');

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function getFavicon(url) {
  try { const h = new URL(url).hostname; return `https://www.google.com/s2/favicons?sz=32&domain=${h}`; }
  catch { return ''; }
}

function addRiverEntry(entry) {
  const el = document.createElement('div');
  el.className = 'river-entry';
  const favicon = getFavicon(entry.url);
  el.innerHTML = `
    <div class="re-favicon">${favicon ? `<img src="${favicon}" width="14" height="14" style="vertical-align:middle">` : '🌊'}</div>
    <div class="re-title">${entry.title || entry.url}</div>
    <div class="re-time">${timeAgo(entry.ts)}</div>
  `;
  el.addEventListener('click', () => { surfer.navigate(entry.url); urlInput.value = entry.url; });
  riverEntries.prepend(el);
  // scroll right to show newest
  riverEntries.parentElement.scrollLeft = riverEntries.parentElement.scrollWidth;
}

surfer.on('history-entry', entry => addRiverEntry(entry));

// Load recent history on startup
surfer.getHistory().then(hist => {
  hist.slice(0, 30).reverse().forEach(addRiverEntry);
});

// ── Bookmarks ─────────────────────────────────────────────────────────────────
const btnBookmark = document.getElementById('btn-bookmark');
let currentBookmarks = [];

async function checkBookmarkState(url) {
  currentBookmarks = await surfer.getBookmarks();
  const saved = currentBookmarks.some(b => b.url === url);
  btnBookmark.classList.toggle('saved', saved);
  btnBookmark.title = saved ? 'Remove bookmark' : 'Bookmark this page';
}

btnBookmark.addEventListener('click', async () => {
  const url = urlInput.value;
  if (!url || url.startsWith('about:')) return;
  const existing = currentBookmarks.find(b => b.url === url);
  if (existing) {
    currentBookmarks = await surfer.removeBookmark(existing.id);
  } else {
    const title = pageTitle.textContent || url;
    currentBookmarks = await surfer.addBookmark({ url, title, ts: Date.now() });
  }
  checkBookmarkState(url);
  if (activePanel === 'archive') renderArchive();
});

// ── Panel System ─────────────────────────────────────────────────────────────
// Expose globally so homepage (in BrowserView) can call via webview-preload
window.__surfer_openPanel = (name) => openPanel(name);
const overlay = document.getElementById('panel-overlay');
let activePanel = null;

function openPanel(name) {
  if (activePanel === name) { closePanel(); return; }
  closePanel(false);
  activePanel = name;

  overlay.classList.remove('hidden');
  const panel = document.getElementById(`panel-${name}`);
  panel.classList.remove('hidden');
  setTimeout(() => panel.classList.add('open'), 10);

  document.querySelectorAll('.building').forEach(b => b.classList.remove('active'));
  document.getElementById(`b-${name}`).classList.add('active');

  if (name === 'archive')     renderArchive();
  if (name === 'observatory') renderObservatory();
  if (name === 'tidepool')    renderTidepool();
  if (name === 'dojo')        renderDojo();
}

function closePanel(clearActive = true) {
  if (!activePanel) return;
  const panel = document.getElementById(`panel-${activePanel}`);
  panel.classList.remove('open');
  setTimeout(() => { panel.classList.add('hidden'); overlay.classList.add('hidden'); }, 350);
  document.querySelectorAll('.building').forEach(b => b.classList.remove('active'));
  if (clearActive) activePanel = null;
}

document.querySelectorAll('.building').forEach(b => {
  b.addEventListener('click', () => openPanel(b.dataset.building));
});

// ── Archive Panel ─────────────────────────────────────────────────────────────
function renderArchive() {
  const el = document.getElementById('pi-archive');
  surfer.getBookmarks().then(bookmarks => {
    el.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">Archive</div>
          <span class="panel-title-jp">保存された場所</span>
        </div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div id="archive-search-row" class="row">
        <input class="panel-input flex1" id="arch-search" placeholder="Search saved pages…">
      </div>
      <div id="archive-list"></div>
    `;

    const listEl = el.querySelector('#archive-list');
    const searchInput = el.querySelector('#arch-search');

    function renderList(items) {
      listEl.innerHTML = items.length ? '' : `<div class="empty-state">No saved pages yet.<br>Press ⊕ to archive any page.</div>`;
      items.forEach(bm => {
        const item = document.createElement('div');
        item.className = 'panel-item';
        item.innerHTML = `
          <img src="${getFavicon(bm.url)}" width="16" height="16" onerror="this.style.display='none'">
          <div style="flex:1;overflow:hidden">
            <div class="panel-item-title">${bm.title || bm.url}</div>
            <div class="panel-item-sub">${bm.url}</div>
          </div>
          <button class="panel-item-del" data-id="${bm.id}">✕</button>
        `;
        item.addEventListener('click', e => {
          if (e.target.classList.contains('panel-item-del')) return;
          surfer.navigate(bm.url);
        });
        item.querySelector('.panel-item-del').addEventListener('click', async () => {
          await surfer.removeBookmark(bm.id);
          renderArchive();
        });
        listEl.appendChild(item);
      });
    }

    renderList(bookmarks);
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      renderList(bookmarks.filter(b => b.title?.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)));
    });
  });
}

// ── Dojo Panel ────────────────────────────────────────────────────────────────
let dojoMessages = [];

function renderDojo() {
  const el = document.getElementById('pi-dojo');
  el.innerHTML = `
    <div class="panel-header">
      <div>
        <div class="panel-title">⛩ Dojo</div>
        <span class="panel-title-jp">知の道場 — AI読書師</span>
      </div>
      <button class="panel-close" onclick="closePanel()">✕</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      <button class="panel-btn" id="dojo-summarize">Summarize page</button>
      <button class="panel-btn" id="dojo-tldr">TL;DR</button>
      <button class="panel-btn" id="dojo-clear">Clear</button>
    </div>
    <div id="dojo-messages"></div>
    <div id="dojo-input-row">
      <textarea class="panel-input" id="dojo-input" placeholder="Ask about this page…"></textarea>
      <button class="panel-btn" id="dojo-send">→</button>
    </div>
  `;

  const msgEl  = el.querySelector('#dojo-messages');
  const input  = el.querySelector('#dojo-input');

  function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = `dojo-msg ${role}`;
    d.textContent = text;
    msgEl.appendChild(d);
    msgEl.scrollTop = msgEl.scrollHeight;
    if (role !== 'thinking') dojoMessages.push({ role: role === 'user' ? 'user' : 'assistant', content: text });
    return d;
  }

  // Restore history
  dojoMessages.forEach(m => {
    const d = document.createElement('div');
    d.className = `dojo-msg ${m.role === 'user' ? 'user' : 'ai'}`;
    d.textContent = m.content;
    msgEl.appendChild(d);
  });

  async function askDojo(userMsg, systemExtra = '') {
    const thinking = addMsg('thinking', '…reading the current page…');
    const page = await surfer.getPageText();
    const system = `You are the Dojo — a wise, concise AI assistant built into the Surfer browser. You help the user understand the current page they are viewing.

Current page: ${page.title}
URL: ${page.url}
Content (first 6000 chars):
${page.text}
${systemExtra}

Be concise and insightful. Use plain text, no markdown.`;

    const messages = [
      ...dojoMessages.filter(m => m.content !== userMsg).slice(-6),
      { role: 'user', content: userMsg }
    ];

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system,
          messages,
        })
      });
      const data = await res.json();
      const reply = data.content?.map(c => c.text || '').join('') || 'No response.';
      thinking.remove();
      addMsg('ai', reply);
    } catch (e) {
      thinking.remove();
      addMsg('ai', 'Could not reach the Dojo. Check your connection.');
    }
  }

  el.querySelector('#dojo-summarize').addEventListener('click', () => {
    addMsg('user', 'Summarize this page for me.');
    askDojo('Summarize this page for me.');
  });
  el.querySelector('#dojo-tldr').addEventListener('click', () => {
    addMsg('user', 'Give me a TL;DR of this page in 3 bullet points.');
    askDojo('Give me a TL;DR of this page in 3 bullet points.');
  });
  el.querySelector('#dojo-clear').addEventListener('click', () => {
    dojoMessages = [];
    msgEl.innerHTML = '';
  });

  async function sendInput() {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    addMsg('user', msg);
    await askDojo(msg);
  }

  el.querySelector('#dojo-send').addEventListener('click', sendInput);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInput(); } });
}

// ── Tidepool Panel ────────────────────────────────────────────────────────────
function renderTidepool() {
  const el = document.getElementById('pi-tidepool');
  surfer.getPasswords().then(passwords => {
    el.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-title">⚿ Tidepool</div>
          <span class="panel-title-jp">秘密の水溜り — パスワード管理</span>
        </div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--brush)">
        🔒 All secrets stored locally. Never leaves your machine.
      </div>
      <div class="row">
        <input class="panel-input flex1" id="tp-site"  placeholder="Site (e.g. github.com)">
      </div>
      <div class="row">
        <input class="panel-input flex1" id="tp-user"  placeholder="Username / Email">
      </div>
      <div class="row">
        <input class="panel-input flex1" id="tp-pass" type="password" placeholder="Password">
        <button class="panel-btn" id="tp-gen">Generate</button>
      </div>
      <div class="row">
        <button class="panel-btn flex1" id="tp-save">Save secret</button>
      </div>
      <div style="margin-top:16px;margin-bottom:8px;font-size:11px;color:var(--brush-dim);letter-spacing:0.1em;text-transform:uppercase">Saved</div>
      <div id="tp-list"></div>
    `;

    const listEl = el.querySelector('#tp-list');

    function renderList(items) {
      listEl.innerHTML = items.length ? '' : `<div class="empty-state">No secrets yet.</div>`;
      items.forEach(pw => {
        const item = document.createElement('div');
        item.className = 'panel-item pw-entry';
        item.innerHTML = `
          <div style="flex:1;overflow:hidden">
            <div class="panel-item-title">${pw.site}</div>
            <div class="panel-item-sub">${pw.username}</div>
          </div>
          <button class="pw-toggle" data-id="${pw.id}">show</button>
          <button class="panel-item-del" data-id="${pw.id}">✕</button>
        `;
        item.querySelector('.pw-toggle').addEventListener('click', async function() {
          if (this.textContent === 'show') {
            this.textContent = pw.password;
            this.style.color = 'var(--gold)';
            setTimeout(() => { this.textContent = 'show'; this.style.color = ''; }, 4000);
          }
        });
        item.querySelector('.panel-item-del').addEventListener('click', async () => {
          await surfer.deletePassword(pw.id);
          renderTidepool();
        });
        listEl.appendChild(item);
      });
    }

    renderList(passwords);

    el.querySelector('#tp-gen').addEventListener('click', () => {
      const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';
      el.querySelector('#tp-pass').value = Array.from({length: 20}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      el.querySelector('#tp-pass').type = 'text';
    });

    el.querySelector('#tp-save').addEventListener('click', async () => {
      const site = el.querySelector('#tp-site').value.trim();
      const username = el.querySelector('#tp-user').value.trim();
      const password = el.querySelector('#tp-pass').value.trim();
      if (!site || !password) return;
      await surfer.savePassword({ site, username, password });
      renderTidepool();
    });
  });
}

// ── Observatory Panel ─────────────────────────────────────────────────────────
function renderObservatory() {
  const el = document.getElementById('pi-observatory');
  surfer.getBlockedCount().then(blocked => {
    surfer.getCurrentUrl().then(url => {
      const isHttps = url.startsWith('https://');
      let domain = '';
      try { domain = new URL(url).hostname; } catch {}

      el.innerHTML = `
        <div class="panel-header">
          <div>
            <div class="panel-title">◎ Observatory</div>
            <span class="panel-title-jp">観測所 — プライバシー監視</span>
          </div>
          <button class="panel-close" onclick="closePanel()">✕</button>
        </div>
        <div style="margin-bottom:16px;padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(138,170,187,0.1)">
          <div style="font-size:11px;color:var(--brush-dim);margin-bottom:4px">Current site</div>
          <div style="font-size:14px;color:var(--foam);word-break:break-all">${domain || '—'}</div>
        </div>
        <div class="obs-stat">
          <span class="obs-stat-label">Trackers blocked this session</span>
          <span class="obs-stat-value">${blocked}</span>
        </div>
        <div class="obs-stat">
          <span class="obs-stat-label">Connection encrypted</span>
          <span class="obs-stat-value ${isHttps ? 'good' : 'bad'}">${isHttps ? '✓ HTTPS' : '✗ HTTP'}</span>
        </div>
        <div class="obs-stat">
          <span class="obs-stat-label">Telemetry sent to Surfer</span>
          <span class="obs-stat-value good">None</span>
        </div>
        <div class="obs-stat">
          <span class="obs-stat-label">History stored</span>
          <span class="obs-stat-value good">Local only</span>
        </div>
        <div class="obs-stat">
          <span class="obs-stat-label">Passwords stored</span>
          <span class="obs-stat-value good">Local only</span>
        </div>
        <div style="margin-top:20px">
          <div style="font-size:11px;color:var(--brush-dim);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">Blocked trackers</div>
          ${[
            'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
            'facebook.com/tr', 'connect.facebook.net', 'hotjar.com',
            'mixpanel.com', 'segment.com', 'amplitude.com'
          ].map(t => `<div style="font-size:11px;color:var(--brush-dim);padding:4px 0;border-bottom:1px solid rgba(138,170,187,0.06)">✕ ${t}</div>`).join('')}
        </div>
      `;
    });
  });
}


// ── River Toggle ──────────────────────────────────────────────────────────────
const riverTab       = document.getElementById('river-tab');
const riverContainer = document.getElementById('river-container');
let riverVisible = false;

riverTab.addEventListener('click', async () => {
  riverVisible = await surfer.toggleRiver();
  riverContainer.classList.toggle('river-hidden', !riverVisible);
  riverTab.classList.toggle('open', riverVisible);
});
