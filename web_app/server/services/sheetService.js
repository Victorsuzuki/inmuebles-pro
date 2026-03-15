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

    doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth(serviceAccountAuth);
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
    try {
        const doc = await getDoc();

        const schemas = {
            'Properties': ['id', 'address', 'city', 'zip', 'type', 'price', 'status', 'owner', 'description', 'cleaningService',
                'bedrooms', 'bathrooms', 'sqMeters', 'floor', 'hasElevator', 'hasParking', 'hasPool', 'hasTerrace', 'hasAC', 'hasHeating', 'heatingType',
                'furnished', 'orientation', 'yearBuilt', 'energyCert', 'rentalPrice', 'depositMonths', 'communityFees', 'dossierUrl', 'dossierFileId', 'archived'],
            'PropertyPhotos': ['id', 'propertyId', 'driveFileId', 'driveUrl', 'caption', 'order'],
            'Inventory': ['id', 'propertyId', 'category', 'item', 'quantity', 'size', 'condition', 'notes', 'lastUpdated', 'updatedBy'],
            'InventoryIncidents': ['id', 'inventoryId', 'propertyId', 'description', 'status', 'createdDate', 'createdBy', 'resolvedDate', 'resolvedBy', 'resolutionNotes'],
            'Events': ['id', 'propertyId', 'clientId', 'type', 'startDate', 'endDate', 'description', 'status', 'assignedTo'],
            'Users': ['id', 'email', 'role', 'name', 'password'],
            'Clients': ['id', 'name', 'email', 'phone', 'dni', 'status', 'notes'],
            'Payments': ['id', 'propertyId', 'clientId', 'amount', 'date', 'type', 'status', 'description'],
            'Cleaners': ['id', 'name', 'phone', 'email', 'status', 'notes'],
            'CleaningSchedule': ['id', 'propertyId', 'cleanerId', 'frequency', 'dayOfWeek', 'startDate', 'endDate', 'status', 'notes'],
            'CleaningLogs': ['id', 'scheduleId', 'cleanerId', 'propertyId', 'date', 'entryTime', 'exitTime', 'observations', 'status']
        };

        for (const [title, headers] of Object.entries(schemas)) {
            try {
                if (!doc.sheetsByTitle[title]) {
                    await doc.addSheet({ title, headerValues: headers, gridProperties: { columnCount: Math.max(headers.length, 20) } });
                    console.log(`Created sheet: ${title}`);
                } else {
                    const sheet = doc.sheetsByTitle[title];
                    let existingHeaders = [];
                    try {
                        await sheet.loadHeaderRow();
                        existingHeaders = sheet.headerValues;
                    } catch (e) {
                        // If loadHeaderRow fails, it means the sheet is likely empty or has no recognizable headers.
                        // In this case, we proceed to set the headers.
                        console.log(`Sheet "${title}" is empty or has no headers. Setting them now...`);
                        // No need to set existingHeaders here, as the next block will handle it.
                    }

                    // If existingHeaders is still empty after trying to load, or if it was empty initially,
                    // set the headers. This covers both empty sheets and sheets without a header row.
                    if (!existingHeaders || existingHeaders.length === 0) {
                        await sheet.setHeaderRow(headers);
                        existingHeaders = headers; // Update existingHeaders after setting them
                        console.log(`Set initial headers for ${title}.`);
                    }

                    const missingHeaders = headers.filter(h => !existingHeaders.includes(h));

                    if (missingHeaders.length > 0) {
                        const newHeaders = [...existingHeaders, ...missingHeaders];
                        // Ensure grid is large enough
                        if (sheet.columnCount < newHeaders.length) {
                            await sheet.updateProperties({ gridProperties: { columnCount: newHeaders.length + 5 } });
                        }
                        await sheet.setHeaderRow(newHeaders);
                        console.log(`Updated headers for ${title}: added ${missingHeaders.join(', ')}`);
                    }
                }
            } catch (sheetErr) {
                console.error(`Error initializing sheet "${title}":`, sheetErr.message);
            }
        }
        console.log('Google Sheets check completed.');
    } catch (error) {
        console.error('Critical error in initializeSheets:', error.message);
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
