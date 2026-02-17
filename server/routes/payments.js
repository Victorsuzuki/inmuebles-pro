const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.getPayments);
router.post('/', controller.createPayment);
router.put('/:id', controller.updatePayment);
router.delete('/:id', controller.deletePayment);

module.exports = router;
