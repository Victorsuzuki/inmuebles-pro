const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/cleaningScheduleController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', scheduleController.getSchedule);
router.post('/', scheduleController.createAssignment);
router.post('/generate', scheduleController.generateProposal);
router.post('/save', scheduleController.saveSchedule);
router.put('/:id', scheduleController.updateAssignment);
router.delete('/:id', scheduleController.deleteAssignment);

module.exports = router;
