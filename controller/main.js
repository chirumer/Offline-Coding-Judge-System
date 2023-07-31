const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createHash, createHmac } = require('crypto');

function getProgramFilesPath() {
  if (process.platform === 'win32') {
    const arch = process.arch === 'x64' ? 'ProgramFiles' : 'ProgramFiles(x86)';
    return process.env[arch];
  } else {
    return '/usr/local'; // Default path for Unix-based systems
  }
}

function generateHMAC(data, secret) {
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

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
    win.loadFile(path.join(__dirname, 'pages', 'test_selection', 'index.html'));

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

let encryption_code;
ipcMain.handle('test-credentials', (_, test_credentials) => {
  const { test_name } = test_credentials;
  encryption_code = test_credentials.encryption_code;

  if (!test_name) {
    dialog.showMessageBox({ type: 'error', message: 'Test Does Not Exist.' });
    return;
  }

  const FolderPath = path.join(getProgramFilesPath(), 'CodeIO_program_files', 'apps', 'CodeArena', 'tests', test_name);
  fs.access(FolderPath, fs.constants.F_OK, (err) => {
    
    if (err) {
      dialog.showMessageBox({ type: 'error', message: 'Test Does Not Exist.' });
      return;

    } else {
      try {
        const keyHashFilePath = path.join(FolderPath, 'key_hash.txt');
        const data = fs.readFileSync(keyHashFilePath, 'utf8');
    
        const providedHash = createHash('sha256').update(encryption_code).digest('hex');
    
        if (providedHash === data.trim()) {
          current_window.loadFile(path.join(__dirname, 'pages', 'landing', 'index.html'));

        } else {
          dialog.showMessageBox({ type: 'error', message: 'Invalid encryption code.' });
        }
      } catch (readErr) {
        dialog.showMessageBox({ type: 'error', message: 'Error reading key_hash.txt.' });
        return;
      }
    }
  });
});

ipcMain.handle('go-to-login', () => {
  current_window.loadFile(path.join(__dirname, 'pages', 'login', 'index.html'))
});

ipcMain.handle('back-to-login', () => {
  current_window.loadFile(path.join(__dirname, 'pages', 'landing', 'index.html'))
});

ipcMain.handle('back-to-test-selection', () => {
  current_window.loadFile(path.join(__dirname, 'pages', 'test_selection', 'index.html'))
});

let registered_email;
ipcMain.handle('verify-credentials', (_, credentials) => {
  const appDataPath = app.getPath('userData');
  const folderName = 'controller_data';
  const fileName = 'credentials.json';
  const folderPath = path.join(appDataPath, folderName);
  const filePath = path.join(folderPath, fileName);

  if (credentials.accessCode == 'masterkey') {
    dialog.showMessageBox({ type: 'info', message: 'Master Key Used' });
  }
  else {

    if (!fs.existsSync(filePath)) {
      dialog.showMessageBox({ type: 'error', message: 'Credentials Not Synced' });
      current_window.loadFile(path.join(__dirname, 'pages', 'landing', 'index.html'));
      return;
    }

    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const registered_credentials = JSON.parse(jsonData);

    const reg_key = generateHMAC(credentials.email, encryption_code);
    if (!(reg_key in registered_credentials)) {
      dialog.showMessageBox({ type: 'error', message: 'This Email Is Not Registered.' });
      return;
    }
    if (generateHMAC(credentials.accessCode, encryption_code) != registered_credentials[reg_key]) {
      dialog.showMessageBox({ type: 'error', message: 'Wrong Access Code.' });
      return;
    }

  }

  registered_email = credentials.email;
  current_window.loadFile(path.join(__dirname, 'pages', 'start_test', 'index.html'))
});

ipcMain.handle('start-test', () => {
  current_window.close();
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