require('dotenv').config();
const { getSheet } = require('./services/sheetService');

async function checkRawKeys() {
    try {
        const sheet = await getSheet('Properties');
        const rows = await sheet.getRows();
        if (rows.length > 0) {
            console.log('Raw keys for first row:', rows[0]._rawData);
            console.log('Keys from toObject():', Object.keys(rows[0].toObject()));
        } else {
            console.log('No rows found to check keys.');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkRawKeys();
