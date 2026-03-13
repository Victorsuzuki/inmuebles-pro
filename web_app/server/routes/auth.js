const express = require('express');
const router = express.Router();
const { login, register, registerPublic } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Login es público
router.post('/login', login);

// Register protegido: solo SUPERVISOR puede crear usuarios
router.post('/register', authenticate, authorize('SUPERVISOR'), register);

// Register público
router.post('/register-public', registerPublic);

module.exports = router;
