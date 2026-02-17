const express = require('express');
const router = express.Router();
const propertiesController = require('../controllers/propertiesController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', propertiesController.getProperties);
router.post('/', propertiesController.createProperty);
router.put('/:id', propertiesController.updateProperty);
router.delete('/:id', propertiesController.deleteProperty);

module.exports = router;
