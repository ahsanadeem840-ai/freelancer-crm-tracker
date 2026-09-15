const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    zip: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID (owner) is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Client contact name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [120, 'Company name cannot exceed 120 characters'],
      default: '',
    },
    email: {
      type: String,
      required: [true, 'Client email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid client email',
      ],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: {
        values: ['lead', 'prospect', 'active', 'inactive'],
        message: '{VALUE} is not a valid client status',
      },
      default: 'lead',
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    totalBilled: {
      type: Number,
      default: 0,
      min: [0, 'Total billed cannot be negative'],
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: [0, 'Total paid cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast multi-tenant queries
clientSchema.index({ userId: 1, email: 1 });
clientSchema.index({ userId: 1, status: 1 });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
