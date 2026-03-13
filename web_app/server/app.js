require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const { initializeSheets } = require('./services/sheetService');

// CORS: restringir a origen del cliente
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize Sheets asynchronously, but don't block defining routes
let isReady = false;
let initPromise = initializeSheets().then(() => { 
    isReady = true; 
    console.log('Google Sheets initialization complete');
}).catch(err => {
    console.error('Failed to initialize Google Sheets connection:', err.message);
});

// Middleware to ensure sheets are ready before serving requests
app.use(async (req, res, next) => {
    if (!isReady) {
        try {
            await initPromise;
        } catch (e) {
            return res.status(500).json({ error: "Failed to initialize Google Sheets connection" });
        }
    }
    next();
});

app.use('/api/public', require('./routes/public'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/events', require('./routes/events'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/cleaners', require('./routes/cleaners'));
app.use('/api/cleaning-schedule', require('./routes/cleaningSchedule'));
app.use('/api/cleaning-logs', require('./routes/cleaningLogs'));
app.use('/api/inventory', require('./routes/inventory'));

app.get('/', (req, res) => {
    res.send('Property Management System API - Serverless Ready');
});

module.exports = app;
