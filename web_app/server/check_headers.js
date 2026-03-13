require('dotenv').config();
const { getDoc } = require('./services/sheetService');

async function checkHeaders() {
    try {
        const doc = await getDoc();
        console.log(`Analyzing ${doc.sheetsByIndex.length} sheets...`);
        for (const sheet of doc.sheetsByIndex) {
            try {
                await sheet.loadHeaderRow();
                console.log(`[OK] Sheet: "${sheet.title}" | Headers: ${sheet.headerValues.join(', ')}`);
            } catch (err) {
                console.log(`[ERR] Sheet: "${sheet.title}" | Error: ${err.message}`);
            }
        }
    } catch (err) {
        console.error('Critical Error:', err.message);
    }
}

checkHeaders();
