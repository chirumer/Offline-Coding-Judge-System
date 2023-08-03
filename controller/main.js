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

function displayLongDialog() {
  const options = {
    type: 'info',
    title: 'Long Dialog Box',
    message: 'This is a long dialog box with a lot of text. You can put your lengthy message here.This is a long dialog box with a lot of text. You can put your lengthy message here.This is a long dialog box with a lot of text. You can put your lengthy message here.This is a long dialog box with a lot of text. You can put your lengthy message here.This is a long dialog box with a lot of text. You can put your lengthy message here.This is a long dialog box with a lot of text. You can put your lengthy message here.This is a long dialog box with a lot of text. You can put your lengthy message here.This is a long dialog box with a lot of text. You can put your lengthy message here.',
    buttons: ['OK'],
    detail: 'Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.Additional details or information can go here.',
    noLink: true, // Disable hyperlink parsing
  };

  dialog.showMessageBox(current_window, options, (response) => {
    console.log(`User clicked ${options.buttons[response]}`);
  });
}

function remove_this_later() {
  current_window = createAuthWindow();
  encryption_code = 'iocode1';
  registered_email = 'test@gmail.com'
  test_folder = path.join(getProgramFilesPath(), 'CodeIO_program_files', 'apps', 'CodeArena', 'tests', 'test1');
  current_window.loadFile(path.join(__dirname, 'pages', 'start_test', 'index.html'));

  // displayLongDialog();
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

    // globalShortcut.register('Ctrl+Q', () => {
    //   const options = {
    //     type: 'info',
    //     title: 'Enter Password',
    //     message: 'Please enter the password:',
    //     buttons: ['OK', 'Cancel'],
    //     defaultId: 0,
    //     cancelId: 1,
    //     noLink: true,
    //     normalizeAccessKeys: true,
    //     inputFieldLabel: 'Password:',
    //     inputPlaceholder: 'Enter password...',
    //     show: false, // We'll show the dialog manually after customizing the options
    //   };
    
    //   dialog.showMessageBox(null, options).then(({ response, inputValue }) => {
    //     if (response === 0) { // User clicked OK
    //       const password = inputValue.trim(); // Get the entered password
          
    //       if (password === encryption_code) {
    //         const points = questions_info.find(item => item.id === selected_ques_id).points;
    //         current_window.webContents.send('timer_window_update', { points });
    //         user_progress[selected_ques_id].submit_time = submit_time;
    //         user_progress[selected_ques_id].points_earned = points;
    //         save_user_progress();
    //       }
    //     }
    //   });
    // });
    
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
  let new_infos = []
  for (const i of infos) {
    const info = { ...i };
    info.attempted = user_progress[info.id].attempted;
    info.points_earned = user_progress[info.id].points_earned;
    new_infos.push(info)
  }

  return { questions_info: new_infos, current_question: selected_ques_id };
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
  if (language == 'javascript') {
    dialog.showMessageBoxSync(current_window, {
      type: 'error',
      title: 'Language Not Supported',
      message: 'This language is not supported.',
      buttons: ['OK'],
    });
    return;
  }

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









function save_user_progress() {

  const save_obj = { user_progress, registered_email };

  // Save as JSON
  const jsonFilePath = path.join(active_test_path, 'user_progress.json');
  fs.writeFileSync(jsonFilePath, JSON.stringify(save_obj, null, 2));

  // Save as encrypted JSON
  const zip = new AdmZip();
  zip.addFile('user_progress.json', fs.readFileSync(jsonFilePath));

  const zipData = zip.toBuffer();

  const iv = crypto.randomBytes(16);
  const key = hashPassphrase(encryption_code);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encryptedZipData = Buffer.concat([iv, cipher.update(zipData), cipher.final()]);

  const encryptedFilePath = path.join(active_test_path, 'encrypted_user_progress.json');
  fs.writeFileSync(encryptedFilePath, encryptedZipData);
}








function get_public_tests() {
  const input_folder = path.join(active_test_path, 'questions', selected_ques_id, 'public', 'public_input');
  const output_folder = path.join(active_test_path, 'questions', selected_ques_id, 'public', 'public_output');
  
  try {
    const inputFiles = fs.readdirSync(input_folder);
    const outputFiles = fs.readdirSync(output_folder);
    
    const pairs = inputFiles.map((inputFile) => {
      const inputFilePath = path.join(input_folder, inputFile);
      const outputFile = outputFiles.find(outputFile => outputFile === inputFile);
      const outputFilePath = path.join(output_folder, outputFile);
      
      return {
        input: fs.readFileSync(inputFilePath, 'utf-8'),
        output: fs.readFileSync(outputFilePath, 'utf-8')
      };
    });
    
    return pairs;
  } catch (error) {
    console.error('Error:', error);
    return [];  // Return an empty array if there's an error
  }
}


ipcMain.handle('run-program', (_, submit_time) => {

  const public_test_cases = get_public_tests();
  const programPath = path.join(app.getPath('desktop'), 'CodeArena');

  function showDialogBox(title, message) {
    // Replace this with actual Electron dialog box code
    // Example: Using the 'electron' module
    const { dialog } = require('electron');

    dialog.showMessageBoxSync(current_window, {
        type: 'info',
        title: title,
        message: message
    });
  }

  function compiler_error(msg) {
    showDialogBox("Compilation Error", msg);
  }

  function all_passed() {
    const points = questions_info.find(item => item.id === selected_ques_id).points;
    if (user_progress[selected_ques_id].points_earned < points) {
      current_window.webContents.send('timer_window_update', { points });
      user_progress[selected_ques_id].submit_time = submit_time;
      user_progress[selected_ques_id].points_earned = points;
      save_user_progress();
    }
    showDialogBox("Test cases passed", `All Test Cases Passed! ${points} pts added!`);
  }

  function not_passed(result) {
    // Find the first non-matching test case
    const firstFailedTestCase = result.find(testCase => !testCase.passed);
    if (firstFailedTestCase) {
      const input = firstFailedTestCase.input;
      const generatedOutput = firstFailedTestCase.actual_output;
      const expectedOutput = firstFailedTestCase.expected_output;

      showDialogBox(
          "Test case failed",
          `Input:\n${input}\n\nGenerated Output:\n${generatedOutput}\n\nExpected Output:\n${expectedOutput}`
      );
    }
  }

  let run_program;
  const language = user_progress[selected_ques_id].selected_language.toLowerCase();
  if (language == 'c') {
    run_program = run_c_program;
  }
  else if (language == 'cpp') {
    run_program = run_cpp_program;
  }
  else if (language == 'java') {
    run_program = run_java_program;
  }
  else if (language == 'python') {
    run_program = run_python_program;
  }
  else {

  }

  run_program(programPath, public_test_cases, (result) => {
    if (result.compiler_error) {
      compiler_error(result.message);
    }
    else if (result.all_passed) {
      all_passed();
    } else {
      not_passed(result.test_results);
    }
  });
});


const { exec } = require('child_process');
const { spawn } = require('child_process');

function run_c_program(programPath, testCases, callback) {
  
    // Use mingw32-make to build the C program
    exec('mingw32-make', { cwd: programPath, shell: true }, (makeError, makeStdout, makeStderr) => {
        const makeResult = {
            compiler_error: false,
            message: '',
            test_results: []
        };

        if (makeError) {
            makeResult.compiler_error = true;
            makeResult.message = makeStderr;
            callback(makeResult);
            return;
        }

        // Execute the compiled binary and test with each input
        const binaryPath = path.join(programPath, 'runner.exe');
        
        const testResults = [];
        let totalPassed = 0;

        for (const testCase of testCases) {
            const runProcess = spawn(binaryPath);

            let programOutput = '';
            let error

            runProcess.stdout.on('data', (data) => {
                programOutput += data.toString();
            });

            runProcess.stderr.on('data', () => {
                // Handle runtime errors if necessary
            });

            runProcess.on('close', (code) => {
                const testCaseResult = {
                    input: testCase.input,
                    expected_output: testCase.output,
                    actual_output: programOutput,
                    passed: false
                };

                if (code === 0 && programOutput.trim() === testCase.output.trim()) {
                    testCaseResult.passed = true;
                    testPassed = true;
                    totalPassed++;
                }

                testResults.push(testCaseResult);

                if (testResults.length === testCases.length) {
                    const allTestsPassed = testResults.length === totalPassed;
                    const all_passed = allTestsPassed;

                    callback({
                        compiler_error: false,
                        all_passed: all_passed,
                        test_results: testResults
                    });
                }
            });

            runProcess.stdin.write(testCase.input);
            runProcess.stdin.end();
        }
    });
}

function run_cpp_program(programPath, testCases, callback) {
  run_c_program(programPath, testCases, callback);
}


function run_java_program(programPath, testCases, callback) {
    // Use javac to compile the Java program
    exec('javac *.java', { cwd: programPath, shell: true }, (compileError, compileStdout, compileStderr) => {
        const compileResult = {
            compiler_error: false,
            message: '',
            test_results: []
        };

        if (compileError) {
            compileResult.compiler_error = true;
            compileResult.message = compileStderr;
            callback(compileResult);
            return;
        }

        // Execute the compiled Java program and test with each input
        const className = 'Runner';
        const classPath = path.join(programPath, `${className}.class`);
        
        const testResults = [];
        let totalPassed = 0;

        for (const testCase of testCases) {
            const runProcess = spawn('java', [className], { cwd: programPath });

            let programOutput = '';
            let testPassed = false;

            runProcess.stdout.on('data', (data) => {
                programOutput += data.toString();
            });

            runProcess.stderr.on('data', () => {
                // Handle runtime errors if necessary
            });

            runProcess.on('close', (code) => {
                const testCaseResult = {
                    input: testCase.input,
                    expected_output: testCase.output,
                    actual_output: programOutput,
                    passed: false
                };

                if (code === 0 && programOutput.trim() === testCase.output.trim()) {
                    testCaseResult.passed = true;
                    testPassed = true;
                    totalPassed++;
                }

                testResults.push(testCaseResult);

                if (testResults.length === testCases.length) {
                    const allTestsPassed = testResults.length === totalPassed;
                    const all_passed = allTestsPassed;

                    callback({
                        compiler_error: false,
                        all_passed: all_passed,
                        test_results: testResults
                    });
                }
            });

            runProcess.stdin.write(testCase.input);
            runProcess.stdin.end();
        }
    });
}

function run_python_program(programPath, testCases, callback) {
  // Execute the Python program and test with each input
  const pythonFile = 'runner.py';
  const pythonFilePath = path.join(programPath, pythonFile);

  const testResults = [];
  let totalPassed = 0;

  for (const testCase of testCases) {
      const runProcess = spawn('python', [pythonFilePath], { cwd: programPath });

      let programOutput = '';
      let testPassed = false;

      runProcess.stdout.on('data', (data) => {
          programOutput += data.toString();
      });

      runProcess.stderr.on('data', () => {
          // run time error
      });

      runProcess.on('close', (code) => {
          const testCaseResult = {
              input: testCase.input,
              expected_output: testCase.output,
              actual_output: programOutput,
              passed: false
          };

          if (code === 0 && programOutput.trim() === testCase.output.trim()) {
              testCaseResult.passed = true;
              testPassed = true;
              totalPassed++;
          }

          testResults.push(testCaseResult);

          if (testResults.length === testCases.length) {
              const allTestsPassed = testResults.length === totalPassed;
              const all_passed = allTestsPassed;

              callback({
                  compiler_error: false,
                  all_passed: all_passed,
                  test_results: testResults
              });
          }
      });

      runProcess.stdin.write(testCase.input);
      runProcess.stdin.end();
  }
}