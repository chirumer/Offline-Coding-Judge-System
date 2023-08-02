const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

const passphrase = 'test-key';

function hashPassphrase(passphrase) {
    const hash = crypto.createHash('sha256');
    hash.update(passphrase);
    return hash.digest();
}

async function encryptFile(filePath, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  const input = fs.readFileSync(filePath);
  const encryptedData = Buffer.concat([iv, cipher.update(input), cipher.final()]);

  fs.writeFileSync(filePath, encryptedData);
}

async function encryptPrivateFiles(folderPath, key, iv) {
    const files = await fs.readdir(folderPath);
    for (const file of files) {
        const filePath = `${folderPath}/${file}`;
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
            await encryptFile(filePath, key, iv);
        }
    }
}

async function main() {
    try {
        await fs.copy('questions', 'questions_copy');
        const folders = await fs.readdir('questions_copy');

        for (const folder of folders) {
            const privateFolderPath = `questions_copy/${folder}/private`;
            const iv = crypto.randomBytes(16);
            const key = hashPassphrase(passphrase);
            await encryptPrivateFiles(privateFolderPath, key, iv);
        }

        const zip = new AdmZip();
        zip.addLocalFolder('questions_copy');

        const zipData = zip.toBuffer(); // Get the unencrypted ZIP data

        const iv = crypto.randomBytes(16);
        const key = hashPassphrase(passphrase);

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const encryptedZipData = Buffer.concat([iv, cipher.update(zipData), cipher.final()]);

        const zipFilePath = 'encrypted_questions.zip';
        fs.writeFileSync(zipFilePath, encryptedZipData);

        // Clean up temporary folders
        await fs.remove('questions_copy');

        console.log('Encryption completed successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main();