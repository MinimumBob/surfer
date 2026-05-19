const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Storage paths ──────────────────────────────────────────────────────────────
const DATA_DIR = path.join(app.getPath('userData'), 'surfer-data');
const HISTORY_FILE  = path.join(DATA_DIR, 'history.json');
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json');
const PASSWORDS_FILE = path.join(DATA_DIR, 'passwords.json');
const SETTINGS_FILE  = path.join(DATA_DIR, 'settings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readJSON(file, fallback = []) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ── Tracker block list (simple) ───────────────────────────────────────────────
const TRACKER_PATTERNS = [
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
  'facebook.com/tr', 'connect.facebook.net', 'analytics.twitter.com',
  'bat.bing.com', 'scorecardresearch.com', 'quantserve.com',
  'hotjar.com', 'mixpanel.com', 'segment.com', 'amplitude.com',
];
let blockedCount = 0;

// ── Main window & views ───────────────────────────────────────────────────────
let mainWin;
let webView;      // BrowserView for actual browsing
let currentURL = '';
let history = [];

function createWindow() {
  ensureDataDir();
  history = readJSON(HISTORY_FILE, []);

  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0e12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Block trackers
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, cb) => {
    const blocked = TRACKER_PATTERNS.some(p => details.url.includes(p));
    if (blocked) { blockedCount++; mainWin.webContents.send('tracker-blocked', blockedCount); }
    cb({ cancel: blocked });
  });

  mainWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Create the BrowserView for actual web content
  webView = new BrowserView({
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      preload: path.join(__dirname, 'webview-preload.js'),
    }
  });
  mainWin.addBrowserView(webView);

  // River starts collapsed, expands to 180px when toggled
  let riverOpen = false;
  const RIVER_H = 180;

  function updateWebViewBounds() {
    const [nw, nh] = mainWin.getContentSize();
    const bottom = riverOpen ? RIVER_H : 0;
    webView.setBounds({ x: 0, y: 60, width: nw, height: nh - 60 - bottom });
  }

  updateWebViewBounds();
  mainWin.on('resize', updateWebViewBounds);

  ipcMain.handle('toggle-river', () => {
    riverOpen = !riverOpen;
    updateWebViewBounds();
    return riverOpen;
  });

  // Load homepage on startup
  const homePath = path.join(__dirname, 'renderer', 'home.html');
  webView.webContents.loadFile(homePath);

  webView.webContents.on('did-navigate', (e, url) => {
    currentURL = url;
    mainWin.webContents.send('nav-update', { url, canGoBack: webView.webContents.navigationHistory.canGoBack(), canGoFwd: webView.webContents.navigationHistory.canGoForward() });
    addToHistory(url, webView.webContents.getTitle() || url);
  });

  webView.webContents.on('page-title-updated', (e, title) => {
    mainWin.webContents.send('title-update', title);
  });

  webView.webContents.on('did-start-loading', () => mainWin.webContents.send('loading', true));
  webView.webContents.on('did-stop-loading', () => {
    mainWin.webContents.send('loading', false);
    // Inject floating river-toggle button into every page
    webView.webContents.executeJavaScript(`
      (function() {
        if (document.getElementById('__surfer_tab__')) return;
        const btn = document.createElement('div');
        btn.id = '__surfer_tab__';
        btn.innerHTML = '〜 River';
        Object.assign(btn.style, {
          position: 'fixed', bottom: '0', left: '50%', transform: 'translateX(-50%)',
          zIndex: '2147483647', background: 'rgba(10,18,32,0.92)',
          border: '1px solid rgba(138,170,187,0.35)', borderBottom: 'none',
          borderRadius: '8px 8px 0 0', padding: '5px 18px 3px',
          color: '#8faabb', fontSize: '12px', letterSpacing: '0.1em',
          fontFamily: 'serif', cursor: 'pointer', userSelect: 'none',
          backdropFilter: 'blur(8px)', webkitBackdropFilter: 'blur(8px)',
          transition: 'color 0.2s, border-color 0.2s',
        });
        btn.addEventListener('mouseenter', () => { btn.style.color = '#c9a96e'; btn.style.borderColor = 'rgba(201,169,110,0.4)'; });
        btn.addEventListener('mouseleave', () => { btn.style.color = '#8faabb'; btn.style.borderColor = 'rgba(138,170,187,0.35)'; });
        btn.addEventListener('click', () => { window.__surfer_toggleRiver && window.__surfer_toggleRiver(); });
        document.body.appendChild(btn);
      })();
    `).catch(() => {});
  });
}

function addToHistory(url, title) {
  if (url === 'about:blank' || url.startsWith('file://')) return;
  // Don't add a new river entry if this URL is already the most recent entry
  // (handles back/forward navigation to already-seen pages)
  if (history.length > 0 && history[0].url === url) {
    // Just update title if needed, no new entry
    return;
  }
  const entry = { url, title, ts: Date.now() };
  history.unshift(entry);
  if (history.length > 2000) history = history.slice(0, 2000);
  writeJSON(HISTORY_FILE, history);
  mainWin.webContents.send('history-entry', entry);
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('open-panel', (_, name) => {
  mainWin.webContents.send('open-panel', name);
});

ipcMain.handle('go-home', () => {
  const homePath = path.join(__dirname, 'renderer', 'home.html');
  webView.webContents.loadFile(homePath);
});

ipcMain.handle('navigate', (_, url) => {
  let target = url.trim();
  if (!target.startsWith('http')) {
    target = target.includes('.') ? 'https://' + target : `https://search.brave.com/search?q=${encodeURIComponent(target)}`;
  }
  webView.webContents.loadURL(target);
  return target;
});

ipcMain.handle('go-back',    () => { if (webView.webContents.navigationHistory.canGoBack())    webView.webContents.navigationHistory.goBack(); });
ipcMain.handle('go-forward', () => { if (webView.webContents.navigationHistory.canGoForward()) webView.webContents.navigationHistory.goForward(); });
ipcMain.handle('reload',     () => webView.webContents.reload());

ipcMain.handle('get-history',   () => readJSON(HISTORY_FILE, []));
ipcMain.handle('get-bookmarks', () => readJSON(BOOKMARKS_FILE, []));
ipcMain.handle('add-bookmark', (_, bm) => {
  const list = readJSON(BOOKMARKS_FILE, []);
  list.unshift({ ...bm, id: Date.now() });
  writeJSON(BOOKMARKS_FILE, list);
  return list;
});
ipcMain.handle('remove-bookmark', (_, id) => {
  const list = readJSON(BOOKMARKS_FILE, []).filter(b => b.id !== id);
  writeJSON(BOOKMARKS_FILE, list);
  return list;
});

ipcMain.handle('get-passwords', () => readJSON(PASSWORDS_FILE, []));
ipcMain.handle('save-password', (_, entry) => {
  const list = readJSON(PASSWORDS_FILE, []);
  const existing = list.findIndex(p => p.id === entry.id);
  if (existing >= 0) list[existing] = entry;
  else list.unshift({ ...entry, id: Date.now() });
  writeJSON(PASSWORDS_FILE, list);
  return list;
});
ipcMain.handle('delete-password', (_, id) => {
  const list = readJSON(PASSWORDS_FILE, []).filter(p => p.id !== id);
  writeJSON(PASSWORDS_FILE, list);
  return list;
});

ipcMain.handle('get-settings', () => readJSON(SETTINGS_FILE, { theme: 'ink', buildingOrder: ['archive','dojo','tidepool','observatory'] }));
ipcMain.handle('save-settings', (_, s) => { writeJSON(SETTINGS_FILE, s); return s; });

ipcMain.handle('get-page-text', async () => {
  try {
    const text = await webView.webContents.executeJavaScript(`document.body.innerText.slice(0, 8000)`);
    return { url: currentURL, title: webView.webContents.getTitle(), text };
  } catch { return { url: currentURL, title: '', text: '' }; }
});

ipcMain.handle('get-blocked-count', () => blockedCount);
ipcMain.handle('get-current-url',   () => currentURL);

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
