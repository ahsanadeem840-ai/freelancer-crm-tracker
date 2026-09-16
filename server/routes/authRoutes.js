const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public registration / signup routes
router.post('/register', register);
router.post('/signup', register);

// Public login route
router.post('/login', login);

// Protected user profile route
router.get('/me', protect, getMe);

module.exports = router;
