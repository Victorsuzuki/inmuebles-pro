const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.getClients);
router.post('/', controller.createClient);
router.put('/:id', controller.updateClient);
router.delete('/:id', controller.deleteClient);

module.exports = router;
