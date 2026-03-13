require('dotenv').config();
const { google } = require('googleapis');

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

async function verify() {
    console.log('Verifying folder accessibility...');
    console.log('Target ID:', DRIVE_FOLDER_ID);
    console.log('Service Account:', CLIENT_EMAIL);

    try {
        const res = await drive.files.get({
            fileId: DRIVE_FOLDER_ID,
            fields: 'id, name, permissions'
        });
        console.log('Folder found:', res.data.name);
        console.log('Permissions:', JSON.stringify(res.data.permissions, null, 2));

        console.log('Attempting to create a test folder inside...');
        const testFolder = await drive.files.create({
            requestBody: {
                name: 'TEST_CONNECTION_' + Date.now(),
                mimeType: 'application/vnd.google-apps.folder',
                parents: [DRIVE_FOLDER_ID]
            },
            fields: 'id'
        });
        console.log('Test folder created successfully! ID:', testFolder.data.id);

        console.log('Attempting to upload a small test file...');
        const fileMetadata = {
            name: 'test_file.txt',
            parents: [testFolder.data.id]
        };
        const media = {
            mimeType: 'text/plain',
            body: 'Hello World'
        };
        const testFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id'
        });
        console.log('Test file uploaded successfully! ID:', testFile.data.id);

        // Clean up
        await drive.files.delete({ fileId: testFile.data.id });
        await drive.files.delete({ fileId: testFolder.data.id });
        console.log('Cleaned up test file and folder.');

    } catch (err) {
        console.error('ERROR during verification:', err.message);
        if (err.message.includes('404')) {
            console.error('The folder ID was not found or the service account does not have access to it.');
        }
        if (err.message.includes('quota')) {
            console.error('Quota error detected! This usually means the parent folder is not actually a shared folder or the service account is trying to write to its own restricted root.');
        }
    }
}

verify();
