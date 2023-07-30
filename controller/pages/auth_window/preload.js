// preload.js
const { ipcRenderer, contextBridge } = require('electron');

// Expose IPC function to the renderer process
contextBridge.exposeInMainWorld('close_window', () => {
  ipcRenderer.send('close-window');
});