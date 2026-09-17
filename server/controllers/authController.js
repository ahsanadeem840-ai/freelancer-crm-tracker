const { User } = require('../models');

// Email regex pattern for validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Allowed roles
const ALLOWED_ROLES = ['freelancer', 'agency_owner', 'team_member'];

// @desc    Register / Signup a new user
// @route   POST /api/auth/register, POST /api/auth/signup
// @access  Public (Din 5)
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      businessName,
      avatar,
      phone,
      hourlyRate,
      currency,
      skills,
    } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).toLowerCase().trim();

    // 2. Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // 3. Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // 4. Validate role if specified
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `'${role}' is not a valid user role. Allowed roles: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    // 5. Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in instead.',
      });
    }

    // 6. Create new user document (triggers bcrypt pre-save hash hook)
    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password,
      role: role || 'freelancer',
      ...(businessName && { businessName: String(businessName).trim() }),
      ...(avatar && { avatar: String(avatar).trim() }),
      ...(phone && { phone: String(phone).trim() }),
      ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
      ...(currency && { currency: String(currency).trim().toUpperCase() }),
      ...(Array.isArray(skills) && { skills }),
    });

    // 7. Generate JWT authentication token
    const token = user.generateAuthToken();

    // 8. Return response with sanitized user data (password excluded)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user & return JWT token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // Validate email and password presence
    if (!email || !password || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const trimmedEmail = String(email).toLowerCase().trim();

    // Find user by email and explicitly select password field
    const user = await User.findOne({ email: trimmedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password matching via bcrypt compare
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private (Protected via JWT)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: user.toJSON(),
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
