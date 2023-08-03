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

contextBridge.exposeInMainWorld('go_to_test_selection', () => {
  ipcRenderer.invoke('back-to-test-selection');
});

contextBridge.exposeInMainWorld('start_test', () => {
  ipcRenderer.invoke('start-test');
});

contextBridge.exposeInMainWorld('end_test_early', () => {
  ipcRenderer.invoke('end-test-early');
});

contextBridge.exposeInMainWorld('change_question', () => {
  ipcRenderer.invoke('change-question');
});

contextBridge.exposeInMainWorld('run_code', () => {
  ipcRenderer.invoke('run-code');
});

contextBridge.exposeInMainWorld('get_questions_info', () => {
  return ipcRenderer.invoke('questions-info');
});

contextBridge.exposeInMainWorld('select_question', (question_id) => {
  ipcRenderer.invoke('select-question', question_id);
});

contextBridge.exposeInMainWorld('select_language', (language) => {
  ipcRenderer.invoke('select-language', language);
});

contextBridge.exposeInMainWorld('time_over', () => {
  ipcRenderer.invoke('time-over');
});


contextBridge.exposeInMainWorld('timer_window', {

  receive_activate: (callback) => {
    ipcRenderer.on('timer_window_activate', () => {
      callback();
    });
  }
});