const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createAuthWindow() {
    const win = new BrowserWindow({
        center: true,
        width: 400,
        height: 200,
        maximizable: false,
        minimizable: false,
        resizable: false,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'pages', 'auth_window', 'preload.js')
        }
    });
    win.loadFile(path.join(__dirname, 'pages', 'auth_window', 'index.html'));
}

app.whenReady().then(() => {
    createAuthWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createAuthWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('close-window', () => {
  app.quit();
});