/**
 * Script para migrar contraseñas existentes de texto plano a bcrypt.
 * Ejecutar UNA SOLA VEZ después de actualizar el código:
 *   node scripts/migrate-passwords.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { getRows, getSheet } = require('../services/sheetService');

const SALT_ROUNDS = 10;

async function migratePasswords() {
    console.log('Iniciando migración de contraseñas...');

    const sheet = await getSheet('Users');
    const rows = await sheet.getRows();

    let migrated = 0;
    let skipped = 0;

    for (const row of rows) {
        const password = row.get('password');

        // Si ya está hasheada (bcrypt hash empieza con $2b$ o $2a$), saltar
        if (password && (password.startsWith('$2b$') || password.startsWith('$2a$'))) {
            console.log(`  ⏭ ${row.get('email')} — ya hasheada, saltando`);
            skipped++;
            continue;
        }

        if (!password) {
            console.log(`  ⚠ ${row.get('email')} — sin contraseña, saltando`);
            skipped++;
            continue;
        }

        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        row.set('password', hashed);
        await row.save();
        console.log(`  ✅ ${row.get('email')} — contraseña migrada`);
        migrated++;
    }

    console.log(`\nMigración completada: ${migrated} migradas, ${skipped} omitidas.`);
}

migratePasswords()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error en migración:', err);
        process.exit(1);
    });
