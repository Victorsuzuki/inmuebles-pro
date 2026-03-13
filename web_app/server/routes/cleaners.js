const express = require('express');
const router = express.Router();
const cleanersController = require('../controllers/cleanersController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', cleanersController.getCleaners);
router.post('/', cleanersController.createCleaner);
router.put('/:id', cleanersController.updateCleaner);
router.delete('/:id', cleanersController.deleteCleaner);

module.exports = router;
