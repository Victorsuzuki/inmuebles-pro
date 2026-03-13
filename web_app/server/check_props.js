require('dotenv').config();
const { getRows } = require('./services/sheetService');

async function checkData() {
    try {
        const props = await getRows('Properties');
        console.log('--- ALL PROPERTIES ---');
        props.forEach(p => {
            console.log(`ID: ${p.id} | Address: ${p.address} | Status: ${p.status} | Archived: ${p.archived}`);
        });
    } catch (err) {
        console.error(err);
    }
}

checkData();
