const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Inventory items per property
router.get('/property/:propertyId', ctrl.getPropertyInventory);
router.post('/property/:propertyId', ctrl.addInventoryItem);
router.put('/:id', ctrl.updateInventoryItem);
router.delete('/:id', ctrl.deleteInventoryItem);

// Incidents
router.get('/incidents', ctrl.getAllIncidents);
router.get('/incidents/property/:propertyId', ctrl.getPropertyIncidents);
router.post('/incidents', ctrl.createIncident);
router.put('/incidents/:id/resolve', ctrl.resolveIncident);

module.exports = router;
