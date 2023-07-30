const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('close_window', () => {
  ipcRenderer.invoke('close-window');
});

contextBridge.exposeInMainWorld('send_test_credentials', (credentials) => {
  ipcRenderer.invoke('test-credentials', credentials);
});

contextBridge.exposeInMainWorld('sync_credentials', () => {
  ipcRenderer.invoke('sync-credentials');
});

contextBridge.exposeInMainWorld('go_to_login', () => {
  ipcRenderer.invoke('go-to-login');
});

contextBridge.exposeInMainWorld('go_back', () => {
  ipcRenderer.invoke('back-to-login');
});

contextBridge.exposeInMainWorld('send_login', (credentials) => {
  ipcRenderer.invoke('verify-credentials', credentials);
});

contextBridge.exposeInMainWorld('go_to_test_selection', (credentials) => {
  ipcRenderer.invoke('back-to-test-selection', credentials);
});