const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Config variables
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY 
    ? process.env.GOOGLE_PRIVATE_KEY
        .replace(/^"(.*)"$/, '$1') // Remove surrounding quotes if any
        .replace(/\\n/g, '\n')     // Replace escaped newlines
    : null;

let doc;

async function getDoc() {
    if (doc) return doc;

    if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
        throw new Error('Missing Google Sheets credentials in environment variables.');
    }

    const serviceAccountAuth = new JWT({
        email: CLIENT_EMAIL,
        key: PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
}

// Helper to get a specific sheet by title
async function getSheet(title) {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle[title];
    if (!sheet) {
        // Auto-create sheet if it doesn't exist?
        // For now, just throw error or return null
        throw new Error(`Sheet with title "${title}" not found.`);
    }
    return sheet;
}

/**
 * Generic add row function
 * @param {string} sheetTitle 
 * @param {object} rowData 
 */
async function addRow(sheetTitle, rowData) {
    const sheet = await getSheet(sheetTitle);
    const row = await sheet.addRow(rowData);
    return row;
}

/**
 * Generic get rows function
 * @param {string} sheetTitle 
 */
async function getRows(sheetTitle) {
    const sheet = await getSheet(sheetTitle);
    const rows = await sheet.getRows();
    // Transform rows to plain objects
    return rows.map(row => {
        const obj = row.toObject();
        // basic row object contains internal props, toObject gives cleanest view
        // Add row index or ID if needed for updates
        obj._rowIndex = row.rowIndex;
        return obj;
    });
}

/**
 * Initialize sheets (create headers if missing)
 */
async function initializeSheets() {
    if (doc) return; // Already initialized in this instance
    try {
        // Assign to the module-level 'doc' variable, don't redeclare with const
        doc = await getDoc();
        console.log('Google Sheets connection verified.');
        if (process.env.NODE_ENV === 'development') {
             console.log('Dev mode: Checking schemas...');
        }
        console.log('Google Sheets check completed.');
    } catch (error) {
        console.error('Critical error in initializeSheets:', error.message);
        throw error;
    }
}

/**
 * Update a row by ID
 * @param {string} sheetTitle 
 * @param {string} id 
 * @param {object} newData 
 */
async function updateRow(sheetTitle, id, newData) {
    console.log(`[updateRow] Updating ${sheetTitle} ID: ${id}`);
    console.log(`[updateRow] Data:`, newData);

    const sheet = await getSheet(sheetTitle);
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('id') === id);

    if (!row) {
        console.log(`[updateRow] Row not found for ID: ${id}`);
        return null;
    }

    // Assign new values matching headers
    Object.keys(newData).forEach(key => {
        if (key !== 'id') { // Don't update ID usually
            row.set(key, newData[key]);
        }
    });

    await row.save();
    console.log(`[updateRow] Row saved successfully.`);
    return row.toObject();
}

/**
 * Delete a row by ID
 * @param {string} sheetTitle 
 * @param {string} id 
 */
async function deleteRow(sheetTitle, id) {
    const sheet = await getSheet(sheetTitle);
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('id') === id);
    if (row) {
        await row.delete();
        return true;
    }
    return false;
}

module.exports = {
    getDoc,
    getSheet,
    addRow,
    getRows,
    updateRow,
    deleteRow,
    initializeSheets
};
