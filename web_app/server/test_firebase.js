require('dotenv').config();
const { uploadToFirebase, deleteFirebaseFile } = require('./services/firebaseService');

async function test() {
    console.log('--- Firebase Upload Test ---');
    const buffer = Buffer.from('Test File Content ' + Date.now());
    const filename = 'test_firebase_' + Date.now() + '.txt';
    const mimeType = 'text/plain';
    const path = 'tests';

    try {
        console.log('Uploading test file...');
        const result = await uploadToFirebase(buffer, filename, mimeType, path);
        console.log('Upload result:', JSON.stringify(result, null, 2));

        if (result.publicUrl) {
            console.log('SUCCESS: Public URL generated.');
            console.log('Cleaning up...');
            await deleteFirebaseFile(result.fileId);
            console.log('Cleanup done.');
        } else {
            console.error('FAILURE: No public URL returned.');
        }
    } catch (error) {
        console.error('ERROR during Firebase test:', error);
        console.error('Stack:', error.stack);
    }
}

test();
