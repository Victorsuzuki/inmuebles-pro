require('dotenv').config();
const { getSheet } = require('./services/sheetService');

async function checkFirstRow() {
    try {
        const sheet = await getSheet('Properties');
        await sheet.loadCells('A1:Z1');
        const headers = [];
        for (let i = 0; i < 26; i++) {
            const cell = sheet.getCell(0, i);
            if (cell.value) headers.push(cell.value);
            else break;
        }
        console.log('Literal headers (first row):', headers);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkFirstRow();
