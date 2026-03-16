require('dotenv').config();
const { getRows } = require('./services/sheetService');

async function dumpFirstProperty() {
    try {
        console.log('--- DUMPING FIRST PROPERTY ---');
        const rows = await getRows('Properties');
        if (rows.length > 0) {
            console.log(JSON.stringify(rows[0], null, 2));
        } else {
            console.log('No properties found.');
        }
        console.log('--- END DUMP ---');
    } catch (err) {
        console.error('Dump failed:', err.message);
    }
}

dumpFirstProperty();
