require('dotenv').config();
const { getRows } = require('./services/sheetService');

async function checkData() {
    try {
        const props = await getRows('Properties');
        console.log('Sample Property Data (first 3):');
        console.log(JSON.stringify(props.slice(0, 3), null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkData();
