const { ipcRenderer } = require('electron');

// River toggle - called by injected button on web pages
window.__surfer_toggleRiver = () => ipcRenderer.invoke('toggle-river');

// Panel opener - called by homepage buildings when loaded in BrowserView
// Sends an IPC to main, which forwards to chrome renderer
window.__surfer_openPanel = (name) => ipcRenderer.invoke('open-panel', name);

// History - called by homepage to get recent entries
window.__surfer_getHistory = () => ipcRenderer.invoke('get-history');
