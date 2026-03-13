require('dotenv').config();
const { initializeSheets } = require('./services/sheetService');

async function run() {
    console.log('Starting sheet initialization...');
    await initializeSheets();
    console.log('Initialization finished.');
}

run();
