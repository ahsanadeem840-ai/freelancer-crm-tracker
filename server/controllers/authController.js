const { User } = require('../models');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Din 5)
const register = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Auth Register endpoint will be implemented in Din 5 (Phase 2)',
      scheduledDay: 'Din 5',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user & return JWT token
// @route   POST /api/auth/login
// @access  Public (Din 5)
const login = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Auth Login endpoint will be implemented in Din 5 (Phase 2)',
      scheduledDay: 'Din 5',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private (Din 5)
const getMe = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Get Profile endpoint will be implemented in Din 5 (Phase 2)',
      scheduledDay: 'Din 5',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
