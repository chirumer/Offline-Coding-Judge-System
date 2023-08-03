const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

let current_window, secondary_window;
let encryption_code, test_folder, active_test_path;
let registered_email;
let questions_info, user_progress = {};

let selected_ques_id;

function remove_this_later() {
  current_window = createAuthWindow();
  encryption_code = 'iocode1';
  registered_email = 'test@gmail.com'
  test_folder = path.join(getProgramFilesPath(), 'CodeIO_program_files', 'apps', 'CodeArena', 'tests', 'test1');
  current_window.loadFile(path.join(__dirname, 'pages', 'start_test', 'index.html'));
}

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


function hashPassphrase(passphrase) {
  const hash = crypto.createHash('sha256');
  hash.update(passphrase);
  return hash.digest();
}

function decryptFile(filePath, key) {
  const encryptedData = fs.readFileSync(filePath);

  const iv = encryptedData.subarray(0, 16);
  const encryptedContent = encryptedData.subarray(16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decryptedData = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

  fs.writeFileSync(filePath, decryptedData);
}

// Function to delete a directory recursively
function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const currentPath = path.join(dirPath, file);
      if (fs.lstatSync(currentPath).isDirectory()) {
        deleteFolderRecursive(currentPath);
      } else {
        fs.unlinkSync(currentPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

function get_question_infos() {
  const questionsFolderPath = path.join(active_test_path, 'questions');
  const subfolders = fs.readdirSync(questionsFolderPath, { withFileTypes: true });

  const questionInfos = [];

  for (const subfolder of subfolders) {
      if (subfolder.isDirectory()) {
          const privateFolderPath = path.join(questionsFolderPath, subfolder.name, 'private');
          const questionInfoPath = path.join(privateFolderPath, 'question_info.json');

          try {
              decryptFile(questionInfoPath, hashPassphrase(encryption_code));

              const questionInfoData = fs.readFileSync(questionInfoPath, 'utf-8');
              const questionInfo = JSON.parse(questionInfoData);
              questionInfo.id = subfolder.name;

              questionInfos.push(questionInfo);
          } catch (error) {
              console.error(`Error decrypting or loading question info for subfolder ${subfolder.name}:`, error);
          }
      }
  }

  return questionInfos;
}

function load_sample_pdf() {
  
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

    // Register the shortcut to center the window with "Ctrl + W"
    globalShortcut.register('Ctrl+W', () => {
      if (secondary_window) {
        secondary_window.center();
        return;
      }
      win.center();
    });
    
    // When the window is closed, unregister the shortcut to avoid any potential memory leaks
    win.on('closed', () => {
        globalShortcut.unregister('Ctrl+W');
        app.quit();
    });

    win.loadFile(path.join(__dirname, 'pages', 'test_selection', 'index.html'));

    return win;
}

function popupSelection(folder) {
  const win = new BrowserWindow({
      center: true,
      width: 400,
      height: 440,
      maximizable: false,
      minimizable: false,
      resizable: false,
      frame: false,
      alwaysOnTop: true,
      closable: true,
      webPreferences: {
          preload: path.join(__dirname, 'preload.js')
      }
  });

  win.loadFile(path.join(__dirname, 'pages', folder, 'index.html'));

  return win;
}

app.whenReady().then(() => {
    // current_window = createAuthWindow();
    remove_this_later();

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

ipcMain.handle('close-window', (which_window) => {

  if (which_window == 'secondary') {
    secondary_window.close();
    return;
  }

  app.quit();
});

ipcMain.handle('questions-info', () => {

  const infos = questions_info;
  for (const info of infos) {
    info.attempted = user_progress.attempted;
    info.points_earned = user_progress.points_earned;
  }

  return infos;
});

ipcMain.handle('select-question', (_, question_id) => {
  selected_ques_id = question_id;
  secondary_window.close();
  if (!user_progress[question_id].attempted) {
    secondary_window = popupSelection('language_selection');
  }
  else {

  }
});

ipcMain.handle('select-language', (_, language) => {
  secondary_window.close();
  load_sample_pdf(selected_ques_id, language);
});

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

          test_folder = FolderPath;
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
  const appDataPath = app.getPath('userData');
  const folderName = 'controller_data/active_test';
  const folderPath = path.join(appDataPath, folderName);

  if (fs.existsSync(folderPath)) {
    // Delete the folder and create a new one
    deleteFolderRecursive(folderPath);
    fs.mkdirSync(folderPath);
  } else {
    // Create a new folder
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Unencrypt the file
  const encryptedFilePath = path.join(test_folder, 'encrypted_questions.zip')
  const decryptedFilePath = path.join(folderPath, 'questions.zip');

  // Read the encrypted ZIP data
  const encryptedZipData = fs.readFileSync(encryptedFilePath);

  // Get the IV from the first 16 bytes
  const iv = encryptedZipData.subarray(0, 16);
  
  // Get the encrypted content from the rest of the buffer
  const encryptedContent = encryptedZipData.subarray(16);

  const key = hashPassphrase(encryption_code);
  
  // Decrypt the ZIP data
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decryptedZipData = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
  
  fs.writeFileSync(decryptedFilePath, decryptedZipData);

  const zip = new AdmZip(decryptedFilePath);
  const extractionPath = path.join(folderPath, 'questions'); // Extract to the same folder

  try {
    zip.extractAllTo(extractionPath, /*overwrite=*/ true);

    // Delete the decrypted zip file
    fs.unlinkSync(decryptedFilePath);

    active_test_path = folderPath;

    current_window.setClosable(false);
    current_window.loadFile(path.join(__dirname, 'pages', 'timer', 'index.html'));

    questions_info = get_question_infos();
    for (const question of questions_info) {
      user_progress[question.id] = {
        points_earned: 0,
        attempted: false,
        last_submit: 0
      }
    }

    secondary_window = popupSelection('question_selection');

  } catch (err) {
    console.error('Error during unzipping:', err);
  }
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