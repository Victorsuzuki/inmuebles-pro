const express = require('express');
const router = express.Router();
const controller = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');

// Todas las rutas de usuarios requieren autenticación + rol SUPERVISOR
router.use(authenticate);
router.get('/', authorize('SUPERVISOR', 'OPERATOR'), controller.getUsers);
router.use(authorize('SUPERVISOR'));

router.post('/', controller.createUser);
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;
