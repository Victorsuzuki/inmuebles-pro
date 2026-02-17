const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { initializeSheets } = require('../services/sheetService');

console.log('Iniciando configuración de la Base de Datos (Google Sheets)...');

initializeSheets()
  .then(() => {
    console.log('✅ Proceso finalizado. Verifica tu Hoja de Cálculo.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
