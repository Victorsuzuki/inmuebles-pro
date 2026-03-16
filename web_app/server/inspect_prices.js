require('dotenv').config();
const { getRows } = require('./services/sheetService');

async function inspectPrices() {
    try {
        console.log('--- INSPECTING PROPERTY PRICES ---');
        const rows = await getRows('Properties');
        rows.forEach((row, i) => {
            console.log(`Row ${i + 1}: price='${row.price}', rentalPrice='${row.rentalPrice}'`);
        });
        console.log('--- END INSPECTION ---');
    } catch (err) {
        console.error('Inspection failed:', err.message);
    }
}

inspectPrices();
