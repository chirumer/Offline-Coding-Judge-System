const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

const passphrase = 'iocode1';

function hashPassphrase(passphrase) {
    const hash = crypto.createHash('sha256');
    hash.update(passphrase);
    return hash.digest();
}

async function decryptFile(filePath, key) {
  const encryptedData = fs.readFileSync(filePath);

  const iv = encryptedData.subarray(0, 16);
  const encryptedContent = encryptedData.subarray(16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decryptedData = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

  fs.writeFileSync(filePath, decryptedData);
}

async function decryptPrivateFiles(folderPath, key) {
  const files = await fs.readdir(folderPath);
  for (const file of files) {
      const filePath = `${folderPath}/${file}`;
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
          await decryptFile(filePath, key);
      } else if (stat.isDirectory()) {
          await decryptPrivateFiles(filePath, key); // Recursively decrypt files in subfolder
      }
  }
}

async function main() {
  try {
      const zipFilePath = 'encrypted_questions.zip';
      const decryptedFolderPath = 'decrypted_questions';

      // Read the encrypted ZIP data
      const encryptedZipData = fs.readFileSync(zipFilePath);

      // Get the IV from the first 16 bytes
      const iv = encryptedZipData.subarray(0, 16);

      // Get the encrypted content from the rest of the buffer
      const encryptedContent = encryptedZipData.subarray(16);

      const key = hashPassphrase(passphrase);

      // Decrypt the ZIP data
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      const decryptedZipData = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

      // Save the decrypted ZIP data to a temporary file
      const tempZipFilePath = 'decrypted_questions_temp.zip';
      fs.writeFileSync(tempZipFilePath, decryptedZipData);

      // Extract the decrypted ZIP file to a folder
      const zip = new AdmZip(tempZipFilePath);
      zip.extractAllTo(decryptedFolderPath, /*overwrite*/ true);

      // Clean up temporary files
      fs.removeSync(tempZipFilePath);

      // Decrypt private files inside the folder and its subfolders
      const folders = await fs.readdir(decryptedFolderPath);
      for (const folder of folders) {
          const privateFolderPath = `${decryptedFolderPath}/${folder}/private`;
          await decryptPrivateFiles(privateFolderPath, key);
      }

      console.log('Decryption completed successfully.');
  } catch (error) {
      console.error('An error occurred:', error);
  }
}

main();