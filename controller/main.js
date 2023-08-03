const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { renameSync } = require('fs');

let current_window, secondary_window;
let encryption_code, test_folder, active_test_path;
let registered_email;
let questions_info, user_progress = {};

let current_window_inactive = false;

let selected_ques_id = null, previous_selected_ques_id = null;

function end_contest() {
  // Show a confirmation dialog before ending the contest
  const options = {
    type: 'question',
    buttons: ['Yes', 'No'],
    defaultId: 1,
    title: 'Confirmation',
    message: 'Are you sure you want to end the contest?'
  };

  const response = dialog.showMessageBoxSync(current_window, options);

  if (response === 0) { // User clicked 'Yes'
    if (secondary_window) {
      secondary_window.close();
      secondary_window = null;
    }
    current_window.setClosable(true);
    current_window.close();
    current_window = null;
    console.log('Quiz ended');
  } else {
    console.log('Contest not ended');
  }
}

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
  const hmac = crypto.createHmac('sha256', secret);
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

function load_question(what_to_load, old_ques_id, new_ques_id) {

  const codeArenaPath = path.join(app.getPath('desktop'), 'CodeArena');

  if (old_ques_id == null || user_progress[old_ques_id].attempted) {

    const save_path = path.join(active_test_path, 'FolderFiles', old_ques_id == null ? 'initial' : old_ques_id);
    fs.copySync(codeArenaPath, save_path);
  }
  fs.emptydirSync(codeArenaPath)

  const publicFilesPath = path.join(active_test_path, 'questions', new_ques_id, 'public')
  if (what_to_load == 'sample') {
    console.log('loading sample')
    fs.copySync(path.join(publicFilesPath, 'sample.pdf'), path.join(codeArenaPath, 'sample.pdf'))
  }
  else if (what_to_load == 'code') {
    if (user_progress[new_ques_id].attempted) {
      console.log('loading from saved')
      const save_path = path.join(active_test_path, 'FolderFiles', new_ques_id);
      fs.copySync(save_path, codeArenaPath)
    }
    else {
      console.log('loading fresh')
      fs.copySync(path.join(publicFilesPath, 'sample.pdf'), path.join(codeArenaPath, 'sample.pdf'))
      fs.copySync(path.join(publicFilesPath, 'question.pdf'), path.join(codeArenaPath, 'question.pdf'))
      fs.copySync(path.join(publicFilesPath, 'code_templates', user_progress[new_ques_id].selected_language), path.join(codeArenaPath))
      user_progress[new_ques_id].attempted = true;

      console.log(user_progress[new_ques_id])
    }
  }
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

ipcMain.handle('close-window', (_, which_window) => {

  if (which_window == 'secondary') {

    if (selected_ques_id == null) {
      dialog.showMessageBoxSync(secondary_window, { type: 'error', message: 'Not Allowed. You have not loaded your first Question.' });
      return;
    }
    secondary_window.close();
    secondary_window = null;


    if (current_window_inactive) {
      current_window_inactive = false;
      current_window.webContents.send('timer_window_activate', { attempted: user_progress[selected_ques_id].attempted });
    }
    return;
  }
  else {
    app.quit();
  }
});

ipcMain.handle('questions-info', () => {

  const infos = questions_info;
  for (const info of infos) {
    info.attempted = user_progress[info.id].attempted;
    info.points_earned = user_progress[info.id].points_earned;
  }

  return { questions_info: infos, current_question: selected_ques_id };
});

ipcMain.handle('change-question', () => {
  current_window_inactive = true;
  secondary_window = popupSelection('question_selection');
});

ipcMain.handle('select-question', (_, question_id) => {

  previous_selected_ques_id = selected_ques_id;
  selected_ques_id = question_id;
  secondary_window.close();
  secondary_window = null;
  if (!user_progress[question_id].attempted) {
    secondary_window = popupSelection('language_selection');
  }
  else {
    current_window_inactive = false;
    current_window.webContents.send('timer_window_activate', { attempted: user_progress[selected_ques_id].attempted });
    load_question('code', previous_selected_ques_id, selected_ques_id);
  }
});

ipcMain.handle('select-language', (_, language) => {
  secondary_window.close();
  secondary_window = null;
  current_window_inactive = false;
  current_window.webContents.send('timer_window_activate', { attempted: false });
  user_progress[selected_ques_id].selected_language = language;

  // load_sample_pdf(selected_ques_id, language);
  load_question('sample', previous_selected_ques_id, selected_ques_id);
});

ipcMain.handle('end-test-early', () => {
  end_contest();
});

ipcMain.handle('load-template', () => {
  // load_code_template(selected_ques_id, user_progress['selected_language']);
  load_question('code', previous_selected_ques_id, selected_ques_id);
});

ipcMain.handle('test-credentials', (_, test_credentials) => {
  const { test_name } = test_credentials;
  encryption_code = test_credentials.encryption_code;

  if (!test_name) {
    dialog.showMessageBoxSync(current_window, { type: 'error', message: 'Test Does Not Exist.' });
    return;
  }

  const FolderPath = path.join(getProgramFilesPath(), 'CodeIO_program_files', 'apps', 'CodeArena', 'tests', test_name);
  fs.access(FolderPath, fs.constants.F_OK, (err) => {
    
    if (err) {
      dialog.showMessageBoxSync(current_window, { type: 'error', message: 'Test Does Not Exist.' });
      return;

    } else {
      try {
        const keyHashFilePath = path.join(FolderPath, 'key_hash.txt');
        const data = fs.readFileSync(keyHashFilePath, 'utf8');
    
        const providedHash = crypto.createHash('sha256').update(encryption_code).digest('hex');
    
        if (providedHash === data.trim()) {

          test_folder = FolderPath;
          current_window.loadFile(path.join(__dirname, 'pages', 'landing', 'index.html'));

        } else {
          dialog.showMessageBoxSync(current_window, { type: 'error', message: 'Invalid encryption code.' });
        }
      } catch (readErr) {
        console.log(readErr);
        dialog.showMessageBoxSync(current_window, { type: 'error', message: 'Error reading key_hash.txt.' });
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

ipcMain.handle('time-over', () => {
  end_contest();
});

ipcMain.handle('verify-credentials', (_, credentials) => {
  const appDataPath = app.getPath('userData');
  const folderName = 'controller_data';
  const fileName = 'credentials.json';
  const folderPath = path.join(appDataPath, folderName);
  const filePath = path.join(folderPath, fileName);

  if (credentials.accessCode == 'masterkey') {
    dialog.showMessageBoxSync(current_window, { type: 'info', message: 'Master Key Used' });
  }
  else {

    if (!fs.existsSync(filePath)) {
      dialog.showMessageBoxSync(current_window, { type: 'error', message: 'Credentials Not Synced' });
      current_window.loadFile(path.join(__dirname, 'pages', 'landing', 'index.html'));
      return;
    }

    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const registered_credentials = JSON.parse(jsonData);

    const reg_key = generateHMAC(credentials.email, encryption_code);
    if (!(reg_key in registered_credentials)) {
      dialog.showMessageBoxSync(current_window, { type: 'error', message: 'This Email Is Not Registered.' });
      return;
    }
    if (generateHMAC(credentials.accessCode, encryption_code) != registered_credentials[reg_key]) {
      dialog.showMessageBoxSync(current_window, { type: 'error', message: 'Wrong Access Code.' });
      return;
    }

  }

  registered_email = credentials.email;
  current_window.loadFile(path.join(__dirname, 'pages', 'start_test', 'index.html'))
});

function generateUniqueFolderName(basePath) {
  const timestamp = new Date().getTime();
  return path.join(basePath, `backup_${timestamp}`);
}

ipcMain.handle('start-test', () => {
  const appDataPath = app.getPath('userData');
  const folderName = 'controller_data/active_test';
  const folderPath = path.join(appDataPath, folderName);

  if (fs.existsSync(folderPath)) {
    // rename the folder and create a new one
    fs.ensureDirSync(path.join(appDataPath, 'controller_data/archive'));
    renameSync(folderPath, generateUniqueFolderName(path.join(appDataPath, 'controller_data/archive')));
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

    current_window_inactive = true;
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
    dialog.showMessageBoxSync(current_window, { type: 'info', message: successMessage });

    return { success: true };

  } catch (error) {
    console.error('Error fetching or saving credentials:', error.message);

    const errorMessage = `Failed to sync credentials: ${error.message}`;
    dialog.showMessageBoxSync(current_window, { type: 'error', message: errorMessage });

    return { success: false, error: error.message };
  }
});