const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Helper to sanitize env variables (removes quotes, commas, trailing spaces, and extracts ID from URLs)
const sanitize = (val) => {
    if (!val) return null;
    let clean = val.replace(/^[",'\s]+|[",'\s]+$/g, '').trim();
    // If it looks like a URL, extract the ID
    if (clean.includes('/d/')) {
        const matches = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) return matches[1];
    }
    // Remove anything after the first slash if not a full URL but has trailing parts
    return clean.split('/')[0];
};

// Config variables
const SPREADSHEET_ID = sanitize(process.env.SPREADSHEET_ID);
const CLIENT_EMAIL = sanitize(process.env.GOOGLE_CLIENT_EMAIL);
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY 
    ? process.env.GOOGLE_PRIVATE_KEY
        .replace(/\\n/g, '\n')          // Replace escaped \n
        .replace(/^[",'\s]+|[",'\s]+$/g, '') // Remove surrounding quotes/commas
        .trim()
    : null;

let doc = null;
let loadPromise = null;

async function getDoc() {
    // If doc is already fully loaded, return it
    if (doc && doc.title) return doc;

    // If a load is already in progress, wait for it
    if (loadPromise) return loadPromise;

    if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
        throw new Error('Missing Google Sheets credentials in environment variables.');
    }

    loadPromise = (async () => {
        try {
            const serviceAccountAuth = new JWT({
                email: CLIENT_EMAIL,
                key: PRIVATE_KEY,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const newDoc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
            
            console.log(`[getDoc] Calling loadInfo for ID: ${SPREADSHEET_ID.substring(0, 10)}...`);
            
            await Promise.race([
                newDoc.loadInfo(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Google Sheets loadInfo timeout (25s)')), 25000)
                )
            ]);

            doc = newDoc;
            return doc;
        } catch (error) {
            loadPromise = null; // Clear promise so we can retry on next call
            throw error;
        } finally {
            loadPromise = null;
        }
    })();

    return loadPromise;
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
    try {
        await getDoc();
        console.log('Google Sheets connection verified.');
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
    const row = rows.find(r => r.get('id')?.toString().trim().toLowerCase() === id?.toString().trim().toLowerCase());

    if (!row) {
        console.log(`[updateRow] Row NOT found for ID: ${id} (checked ${rows.length} rows)`);
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
    const row = rows.find(r => r.get('id')?.toString().trim().toLowerCase() === id?.toString().trim().toLowerCase());
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
