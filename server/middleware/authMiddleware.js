/**
 * Authentication & Authorization Middleware Placeholder (Din 5 & 6)
 * Full implementation with JWT verification and User lookup in Din 5.
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

  // Din 5 will complete jwt.verify(token, process.env.JWT_SECRET)
  next();
};

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

module.exports = {
  protect,
  authorize,
};
