const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('close_window', () => {
  ipcRenderer.invoke('close-window');
});

contextBridge.exposeInMainWorld('sync_credentials', () => {
  ipcRenderer.invoke('sync-credentials');
});