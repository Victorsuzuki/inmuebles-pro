require('dotenv').config();
const { getSheet } = require('./server/services/sheetService');

async function checkHeaders() {
    try {
        const sheet = await getSheet('Properties');
        await sheet.loadHeaderRow();
        console.log('Headers for Properties:', sheet.headerValues);
        
        const eventsSheet = await getSheet('Events');
        await eventsSheet.loadHeaderRow();
        console.log('Headers for Events:', eventsSheet.headerValues);
        
        const clientsSheet = await getSheet('Clients');
        await clientsSheet.loadHeaderRow();
        console.log('Headers for Clients:', clientsSheet.headerValues);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkHeaders();
