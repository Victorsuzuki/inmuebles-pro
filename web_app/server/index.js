require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

const { initializeSheets } = require('./services/sheetService');

// CORS: restringir a origen del cliente
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

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
    res.send('Property Management System API');
});

initializeSheets()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to start server — Google Sheets initialization error:', err.message);
        process.exit(1);
    });
