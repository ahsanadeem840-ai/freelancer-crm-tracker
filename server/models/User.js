const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
      select: false, // Exclude password from query results by default
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
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Email unique index
userSchema.index({ email: 1 }, { unique: true });

// ==========================================
// Mongoose Pre-Save Hook: Bcrypt Password Hash
// ==========================================
userSchema.pre('save', async function () {
  // Only hash password if it has been created or modified
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ==========================================
// Instance Method: Compare/Match Password
// ==========================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Since password field is select: false, ensure this.password is populated before comparing
  return await bcrypt.compare(enteredPassword, this.password);
};

// ==========================================
// Instance Method: Generate Signed JWT Token
// ==========================================
userSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    role: this.role,
  };

  const secret = process.env.JWT_SECRET || 'freelancer_crm_secret_key_default';
  const expiresIn = process.env.JWT_EXPIRE || '30d';

  return jwt.sign(payload, secret, { expiresIn });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
