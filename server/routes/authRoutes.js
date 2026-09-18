const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const {
  protect,
  authorize,
  isAdmin,
  isClient,
  isAdminOrClient,
} = require('../middleware/authMiddleware');

// Public registration / signup routes
router.post('/register', register);
router.post('/signup', register);

// Public login route
router.post('/login', login);
router.post('/signin', login);

// Protected user profile route
router.get('/me', protect, getMe);

// ==========================================
// Role-Based Protected Routes (Din 7: RBAC)
// ==========================================

// Admin-only route
router.get('/admin-dashboard', protect, isAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Admin Dashboard. Admin authorization confirmed.',
    user: req.user,
  });
});

// Client-only route
router.get('/client-portal', protect, isClient, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Client Portal. Client authorization confirmed.',
    user: req.user,
  });
});

// Admin OR Client route (multi-role protection)
router.get('/admin-or-client', protect, isAdminOrClient, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome. Admin or Client authorization confirmed.',
    user: req.user,
  });
});

module.exports = router;

