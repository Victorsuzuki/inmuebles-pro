require('dotenv').config();
const admin = require('firebase-admin');

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            clientEmail: CLIENT_EMAIL,
            privateKey: PRIVATE_KEY,
            projectId: 'inmuebles-app-487619'
        }),
        storageBucket: STORAGE_BUCKET
    });
}

async function makePublic() {
    console.log(`--- Making Bucket ${STORAGE_BUCKET} Public via IAM ---`);
    const bucket = admin.storage().bucket();

    try {
        console.log('Fetching IAM policy...');
        const [policy] = await bucket.iam.getPolicy({ requestedPolicyVersion: 3 });

        const role = 'roles/storage.objectViewer';
        const member = 'allUsers';

        let binding = policy.bindings.find(b => b.role === role);

        if (!binding) {
            binding = { role: role, members: [] };
            policy.bindings.push(binding);
        }

        if (!binding.members.includes(member)) {
            binding.members.push(member);
            console.log(`Adding ${member} to ${role}...`);
            await bucket.iam.setPolicy(policy);
            console.log('SUCCESS: IAM Policy updated. Bucket is now public.');
        } else {
            console.log('Bucket already has public IAM configuration.');
        }

    } catch (error) {
        console.error('ERROR making bucket public via IAM:', error.message);
        console.log('\nPlease perform this manual step in the Google Cloud Console:');
        console.log(`1. Go to https://console.cloud.google.com/storage/browser/${STORAGE_BUCKET};tab=permissions`);
        console.log('2. Click "Grant Access" (Otorgar acceso)');
        console.log('3. New principals: "allUsers"');
        console.log('4. Role: "Storage Object Viewer" (Visor de objetos de Storage)');
        console.log('5. Save.');
    }
}

makePublic();
