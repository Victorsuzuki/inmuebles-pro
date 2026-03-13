require('dotenv').config();
const admin = require('firebase-admin');

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            clientEmail: CLIENT_EMAIL,
            privateKey: PRIVATE_KEY,
            projectId: 'inmuebles-app-487619'
        })
    });
}

async function discover() {
    console.log('--- Firebase Bucket Discovery ---');
    const project = 'inmuebles-app-487619';
    const candidates = [
        `${project}.firebasestorage.app`,
        `${project}.appspot.com`,
        project
    ];

    for (const name of candidates) {
        console.log(`Checking bucket: ${name}...`);
        try {
            const bucket = admin.storage().bucket(name);
            const [exists] = await bucket.exists();
            if (exists) {
                console.log(`SUCCESS: Bucket ${name} exists!`);
                return;
            } else {
                console.log(`Bucket ${name} does not exist.`);
            }
        } catch (error) {
            console.log(`Error checking ${name}: ${error.message}`);
        }
    }
    console.log('No valid bucket found among candidates.');
}

discover();
