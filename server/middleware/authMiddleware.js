const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Protect middleware:
 * Validates the JWT bearer token from the Authorization header,
 * verifies its signature, and attaches the authenticated user to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. No token provided.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'freelancer_crm_secret_key_default';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid authentication token.',
    });
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'unknown'}' is not authorized to access this route.`,
      });
    }
    next();
  };
};

// verifyToken is an alias for protect middleware for flexibility
const verifyToken = protect;

module.exports = {
  protect,
  verifyToken,
  authorize,
};
