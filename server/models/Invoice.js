const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Line item description is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID (issuer) is required'],
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'An invoice must have at least one line item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'Tax rate cannot be negative'],
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: {
        values: [
          'draft',
          'sent',
          'paid',
          'partially_paid',
          'overdue',
          'cancelled',
        ],
        message: '{VALUE} is not a valid invoice status',
      },
      default: 'draft',
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    paidAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'bank_transfer', 'paypal', 'cash', 'other'],
    },
    stripePaymentIntentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripePaymentUrl: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    terms: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, status: 1 });


const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
