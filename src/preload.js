const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('surfer', {
  navigate:       (url)     => ipcRenderer.invoke('navigate', url),
  goBack:         ()        => ipcRenderer.invoke('go-back'),
  goForward:      ()        => ipcRenderer.invoke('go-forward'),
  reload:         ()        => ipcRenderer.invoke('reload'),

  getHistory:     ()        => ipcRenderer.invoke('get-history'),
  getBookmarks:   ()        => ipcRenderer.invoke('get-bookmarks'),
  addBookmark:    (bm)      => ipcRenderer.invoke('add-bookmark', bm),
  removeBookmark: (id)      => ipcRenderer.invoke('remove-bookmark', id),

  getPasswords:   ()        => ipcRenderer.invoke('get-passwords'),
  savePassword:   (entry)   => ipcRenderer.invoke('save-password', entry),
  deletePassword: (id)      => ipcRenderer.invoke('delete-password', id),

  getSettings:    ()        => ipcRenderer.invoke('get-settings'),
  saveSettings:   (s)       => ipcRenderer.invoke('save-settings', s),

  getPageText:    ()        => ipcRenderer.invoke('get-page-text'),
  getBlockedCount:()        => ipcRenderer.invoke('get-blocked-count'),
  getCurrentUrl:  ()        => ipcRenderer.invoke('get-current-url'),
  toggleRiver:    ()        => ipcRenderer.invoke('toggle-river'),
  goHome:         ()        => ipcRenderer.invoke('go-home'),

  on: (channel, fn) => {
    const allowed = ['nav-update','title-update','loading','tracker-blocked','history-entry','open-panel'];
    if (allowed.includes(channel)) ipcRenderer.on(channel, (_, ...args) => fn(...args));
  },
  off: (channel, fn) => ipcRenderer.removeListener(channel, fn),
});
