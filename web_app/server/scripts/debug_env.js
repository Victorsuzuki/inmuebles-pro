
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('.env loaded successfully.');
    console.log('Parsed keys:', Object.keys(result.parsed));
}

console.log('--- Environment Variables Check ---');
console.log('SPREADSHEET_ID:', process.env.SPREADSHEET_ID ? 'Set' : 'Missing');
console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Missing');
console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'Set (Length: ' + process.env.GOOGLE_PRIVATE_KEY.length + ')' : 'Missing');

console.log('--- Raw Check ---');
const fs = require('fs');
try {
    const rawEnv = fs.readFileSync(envPath, 'utf8');
    console.log('First 50 chars of .env file:', rawEnv.substring(0, 50));
} catch (e) {
    console.error('Could not read .env file directly:', e.message);
}
