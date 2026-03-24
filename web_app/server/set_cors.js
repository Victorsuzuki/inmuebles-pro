/**
 * Script to configure CORS on Firebase Storage bucket
 * Run once: node set_cors.js
 */
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

if (!CLIENT_EMAIL || !PRIVATE_KEY || !STORAGE_BUCKET) {
    console.error('Missing env vars: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET');
    process.exit(1);
}

const storage = new Storage({
    credentials: {
        client_email: CLIENT_EMAIL,
        private_key: PRIVATE_KEY,
    },
    projectId: CLIENT_EMAIL.split('@')[1]?.split('.')[0] || 'inmuebles-app-487619',
});

const corsConfig = [
    {
        origin: ['*'],   // Allow all origins. Restrict to your Amplify URL in production if preferred.
        method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable'],
        maxAgeSeconds: 3600,
    },
];

async function setCors() {
    const bucket = storage.bucket(STORAGE_BUCKET);
    await bucket.setCorsConfiguration(corsConfig);
    console.log(`✅ CORS configured on bucket: ${STORAGE_BUCKET}`);
    console.log('Configuration applied:', JSON.stringify(corsConfig, null, 2));
}

setCors().catch(err => {
    console.error('❌ Error setting CORS:', err.message);
    process.exit(1);
});
