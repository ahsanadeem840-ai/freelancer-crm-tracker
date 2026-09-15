const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: {
        values: ['freelancer', 'agency_owner', 'team_member'],
        message: '{VALUE} is not a valid user role',
      },
      default: 'freelancer',
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: [120, 'Business name cannot exceed 120 characters'],
    },
    avatar: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
    },
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    stripeAccountId: {
      type: String,
      trim: true,
    },
    stripeCustomerId: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Email unique index
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
