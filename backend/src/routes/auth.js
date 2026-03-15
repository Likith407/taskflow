const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../middleware/validate');

// Public routes
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;