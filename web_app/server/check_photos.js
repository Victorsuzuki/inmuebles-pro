require('dotenv').config();
const { getRows } = require('./services/sheetService');

async function check() {
    try {
        console.log('Fetching rows from PropertyPhotos...');
        const rows = await getRows('PropertyPhotos');
        console.log(`Found ${rows.length} rows.`);
        rows.forEach((r, i) => {
            console.log(`[${i}] ID: ${r.id}, PropID: ${r.propertyId}, URL: ${r.driveUrl}`);
        });
    } catch (err) {
        console.error('Error checking sheet:', err.message);
    }
}

check();
