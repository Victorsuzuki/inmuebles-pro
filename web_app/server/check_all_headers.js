require('dotenv').config();
const { getSheet } = require('./services/sheetService');

async function checkAllHeaders() {
    try {
        const sheet = await getSheet('Properties');
        await sheet.loadHeaderRow();
        console.log('ALL HEADERS (count: ' + sheet.headerValues.length + '):');
        console.log(sheet.headerValues);
        
        const matching = sheet.headerValues.filter(h => h.toLowerCase().includes('temporada') || h.toLowerCase().includes('season'));
        console.log('Matching headers for "temporada/season":', matching);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAllHeaders();
