require('dotenv').config();
const { getSheet } = require('./services/sheetService');

async function checkHeaders() {
    try {
        const sheetsToCheck = ['Properties', 'Events', 'Clients', 'Cleaners'];
        for (const title of sheetsToCheck) {
            try {
                const sheet = await getSheet(title);
                await sheet.loadHeaderRow();
                console.log(`Headers for ${title}:`, sheet.headerValues);
            } catch (e) {
                console.log(`Sheet "${title}" not found or error.`, e.message);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkHeaders();
