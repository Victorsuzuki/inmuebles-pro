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
 * Adds any missing columns (from requiredHeaders list) to a sheet.
 * Called at startup — not in the hot path of individual saves.
 */
async function ensureSheetColumns(sheet, requiredHeaders) {
    await sheet.loadHeaderRow();
    const existing = new Set(sheet.headerValues || []);
    const missing = requiredHeaders.filter(k => !existing.has(k));
    if (missing.length === 0) {
        console.log(`[ensureSheetColumns] "${sheet.title}" already has all required columns.`);
        return;
    }

    console.log(`[ensureSheetColumns] Adding to "${sheet.title}":`, missing);

    const startCol = sheet.headerValues.length;
    const totalCols = startCol + missing.length;

    if (totalCols > sheet.columnCount) {
        await sheet.resize({ columnCount: totalCols + 5 });
    }

    const endColLetter = colToLetter(totalCols - 1);
    await sheet.loadCells(`A1:${endColLetter}1`);

    missing.forEach((key, i) => {
        const cell = sheet.getCell(0, startCol + i);
        cell.value = key;
    });

    await sheet.saveUpdatedCells();
    await sheet.loadHeaderRow();
    console.log(`[ensureSheetColumns] "${sheet.title}" now has ${sheet.headerValues.length} columns.`);
}

/** Converts 0-indexed column number to A1 letter notation (0→A, 25→Z, 26→AA…) */
function colToLetter(col) {
    let letter = '';
    let n = col + 1;
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
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

// All columns required in Properties sheet
const PROPERTIES_COLUMNS = [
    'id','address','city','zip','type','price','owner','description',
    'cleaningService','bedrooms','bathrooms','sqMeters','floor',
    'hasElevator','hasParking','hasPool','hasTerrace','hasAC','hasHeating',
    'heatingType','furnished','orientation','yearBuilt','energyCert',
    'pricePerDay','pricePerWeek','pricePerFortnight','rentalPrice',
    'seasonPricePerDay','seasonPricePerWeek','seasonPricePerFortnight','seasonPrice',
    'depositMonths','communityFees',
    'status','archived','dossierUrl'
];

// All columns required in Events sheet
const EVENTS_COLUMNS = [
    'id','propertyId','type','startDate','endDate','description',
    'status','clientId','priceType',
    'rentalPeriod','agreedPrice','totalAmount','cleaningFee'
];

/**
 * Initialize sheets — ensures all required columns exist at Lambda startup.
 */
async function initializeSheets() {
    try {
        await getDoc();
        console.log('Google Sheets connection verified.');

        const propertiesSheet = await getSheet('Properties');
        await ensureSheetColumns(propertiesSheet, PROPERTIES_COLUMNS);

        const eventsSheet = await getSheet('Events');
        await ensureSheetColumns(eventsSheet, EVENTS_COLUMNS);

        console.log('Google Sheets column check completed.');
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
        if (key !== 'id') {
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
