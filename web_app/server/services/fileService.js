const drive = require('@googleapis/drive');
const path = require('path');
const stream = require('stream');

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || ''; // Folder to upload files to

let driveClient;

function getDriveClient() {
    if (driveClient) return driveClient;

    const auth = new drive.auth.JWT({
        email: CLIENT_EMAIL,
        key: PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/drive']
    });

    driveClient = drive.drive({ version: 'v3', auth });
    return driveClient;
}

/**
 * Upload a file buffer to Google Drive
 * @param {Buffer} buffer - File content
 * @param {string} filename - Original filename
 * @param {string} mimeType - e.g. 'image/jpeg', 'application/pdf'
 * @param {string} subfolder - Optional subfolder name within the main folder
 * @returns {object} { fileId, webViewLink, webContentLink }
 */
async function uploadFile(buffer, filename, mimeType, subfolder = '') {
    const drive = getDriveClient();
    const baseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

    let parentId = baseFolderId;

    // If subfolder is specified, find or create the hierarchy
    if (subfolder && parentId) {
        const parts = subfolder.split('/').filter(p => !!p);
        let currentParentId = parentId;

        for (const part of parts) {
            currentParentId = await findOrCreateFolder(part, currentParentId);
        }
        parentId = currentParentId;
    }

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const fileMetadata = {
        name: filename,
        parents: parentId ? [parentId] : []
    };

    const media = {
        mimeType,
        body: bufferStream
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink, webContentLink'
    });

    // Make file publicly accessible
    await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });

    // Get updated links
    const file = await drive.files.get({
        fileId: response.data.id,
        fields: 'id, webViewLink, webContentLink, thumbnailLink'
    });

    return {
        fileId: file.data.id,
        webViewLink: file.data.webViewLink,
        webContentLink: file.data.webContentLink,
        thumbnailLink: file.data.thumbnailLink,
        directLink: `https://drive.google.com/uc?export=view&id=${file.data.id}`
    };
}

/**
 * Find or create a subfolder inside a parent folder
 */
async function findOrCreateFolder(folderName, parentId) {
    const drive = getDriveClient();

    // Search for existing folder
    const search = await drive.files.list({
        // Note: folderName is a single name here, not a path
        q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)'
    });

    if (search.data.files.length > 0) {
        return search.data.files[0].id;
    }

    // Create folder
    const folder = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        },
        fields: 'id'
    });

    return folder.data.id;
}

/**
 * Delete a file from Google Drive
 */
async function deleteFile(fileId) {
    const drive = getDriveClient();
    try {
        await drive.files.delete({ fileId });
        return true;
    } catch (err) {
        console.error(`Error deleting Drive file ${fileId}:`, err.message);
        return false;
    }
}

module.exports = { uploadFile, deleteFile, findOrCreateFolder };
