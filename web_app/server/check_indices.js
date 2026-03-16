require('dotenv').config();
const { getSheet } = require('./services/sheetService');

async function checkHeadersWithIndices() {
    try {
        const sheet = await getSheet('Properties');
        await sheet.loadHeaderRow();
        console.log('HEADERS WITH INDICES:');
        sheet.headerValues.forEach((h, i) => {
            console.log(`${i}: "${h}"`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkHeadersWithIndices();
