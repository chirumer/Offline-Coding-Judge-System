const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const axios = require('axios');
const fs = require('fs');
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
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.loadFile(path.join(__dirname, 'pages', 'landing', 'index.html'));

    return win;
}

let current_window;

app.whenReady().then(() => {
    current_window = createAuthWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            current_window = createAuthWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('close-window', () => {
  app.quit();
});

ipcMain.handle('go-to-login', () => {
  current_window.loadFile(path.join(__dirname, 'pages', 'login', 'index.html'))
});

ipcMain.handle('back-to-login', () => {
  current_window.loadFile(path.join(__dirname, 'pages', 'landing', 'index.html'))
});

ipcMain.handle('verify-credentials', (_, credentials) => {
  console.log(credentials);
});

ipcMain.handle('sync-credentials', async () => {
  try {
    const url = 'https://codeio.club/CodeArena/credentials.json';

    const response = await axios.get(url);
    const credentialsData = response.data;

    const appDataPath = app.getPath('userData');
    const folderName = 'controller_data';
    const fileName = 'credentials.json';
    const folderPath = path.join(appDataPath, folderName);
    const filePath = path.join(folderPath, fileName);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // Write the credentials data to the local file
    fs.writeFileSync(filePath, JSON.stringify(credentialsData, null, 2));

    const successMessage = 'Credentials sync successful!';
    dialog.showMessageBox({ type: 'info', message: successMessage });

    return { success: true };

  } catch (error) {
    console.error('Error fetching or saving credentials:', error.message);

    const errorMessage = `Failed to sync credentials: ${error.message}`;
    dialog.showMessageBox({ type: 'error', message: errorMessage });

    return { success: false, error: error.message };
  }
});