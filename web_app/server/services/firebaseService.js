const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            clientEmail: CLIENT_EMAIL,
            privateKey: PRIVATE_KEY,
            // Project ID is Usually the first part of the email
            projectId: CLIENT_EMAIL?.split('@')[0].split('.')[0] || 'inmuebles-app-487619'
        }),
        storageBucket: STORAGE_BUCKET
    });
}

const bucket = admin.storage().bucket();

/**
 * Upload a file buffer to Firebase Storage
 * @param {Buffer} buffer - File content
 * @param {string} filename - Target filename
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @param {string} path - Target path in bucket (e.g. 'properties/123/')
 * @returns {object} { fileId, webViewLink, publicUrl }
 */
async function uploadToFirebase(buffer, filename, mimeType, path = '') {
    const fullPath = path ? `${path}/${filename}` : filename;
    const file = bucket.file(fullPath.replace(/\/+/g, '/')); // Clean slashes

    await file.save(buffer, {
        metadata: {
            contentType: mimeType,
            metadata: {
                firebaseStorageDownloadTokens: uuidv4()
            }
        }
        // Removed public: true because of uniform bucket-level access
    });

    // Strategy for public URL in Firebase Storage:
    // https://storage.googleapis.com/BUCKET_NAME/FILE_PATH
    const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${file.name}`;

    return {
        fileId: file.name,
        webViewLink: publicUrl,
        publicUrl: publicUrl
    };
}

/**
 * Generate a signed upload URL so the client can upload directly to Firebase Storage
 * (bypasses API Gateway 10MB limit)
 * @param {string} filePath - full path in bucket (e.g. 'properties/123/dossier_123.pdf')
 * @param {string} mimeType - e.g. 'application/pdf'
 * @param {number} expiresInMinutes - how long the URL is valid
 * @returns {object} { signedUrl, publicUrl, fileId }
 */
async function getSignedUploadUrl(filePath, mimeType, expiresInMinutes = 15) {
    const file = bucket.file(filePath);
    const [signedUrl] = await file.getSignedUrl({
        action: 'write',
        expires: Date.now() + expiresInMinutes * 60 * 1000,
        contentType: mimeType,
    });

    const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${filePath}`;
    return { signedUrl, publicUrl, fileId: filePath };
}

/**
 * Delete a file from Firebase Storage
 */
async function deleteFirebaseFile(path) {
    try {
        const file = bucket.file(path);
        await file.delete();
        return true;
    } catch (error) {
        console.error('Error deleting Firebase file:', error.message);
        return false;
    }
}

module.exports = {
    uploadToFirebase,
    deleteFirebaseFile,
    getSignedUploadUrl
};
