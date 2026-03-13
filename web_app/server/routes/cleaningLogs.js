const express = require('express');
const router = express.Router();
const logsController = require('../controllers/cleaningLogsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Cleaner: get my logs
router.get('/mine', logsController.getMyLogs);

// Cleaner: log entry
router.post('/entry', logsController.logEntry);

// Cleaner: log exit + observations
router.put('/:id/exit', logsController.logExit);

// Supervisor: get all logs with filters
router.get('/', logsController.getAllLogs);

// Supervisor: reports
router.get('/report/hours', logsController.getHoursReport);
router.get('/report/notes', logsController.getNotesReport);

module.exports = router;
