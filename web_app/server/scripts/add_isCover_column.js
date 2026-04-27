/**
 * One-time script: adds the "isCover" header to the PropertyPhotos sheet
 * Run with: node scripts/add_isCover_column.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^[",']+|[",']+$/g, '').trim();

(async () => {
    try {
        const auth = new JWT({ email: CLIENT_EMAIL, key: PRIVATE_KEY, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        await doc.loadInfo();

        const sheet = doc.sheetsByTitle['PropertyPhotos'];
        if (!sheet) { console.error('❌ Sheet "PropertyPhotos" not found'); process.exit(1); }

        await sheet.loadHeaderRow();
        const headers = sheet.headerValues;
        console.log('Current headers:', headers);

        if (headers.includes('isCover')) {
            console.log('✅ Column "isCover" already exists, nothing to do.');
            process.exit(0);
        }

        // Append the new header
        const newHeaders = [...headers, 'isCover'];
        await sheet.setHeaderRow(newHeaders);
        console.log('✅ Column "isCover" added successfully!');
        console.log('New headers:', newHeaders);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
