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
          return Array.isArray(items) && items.length > 0;
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

// Indexes for fast querying & uniqueness
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ clientId: 1, status: 1 });

/**
 * Pre-validate hook:
 * 1. Auto-generate invoiceNumber if not provided
 * 2. Auto-set default dueDate (14 days from issueDate) if omitted
 * 3. Calculate line items amount = quantity * unitPrice
 * 4. Auto-compute subtotal, taxAmount, and totalAmount
 * 5. Set paidAt timestamp if status is 'paid'
 */
invoiceSchema.pre('validate', function () {
  // 1. Auto invoice number if missing
  if (!this.invoiceNumber || !String(this.invoiceNumber).trim()) {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.invoiceNumber = `INV-${year}-${randomSuffix}`;
  } else {
    this.invoiceNumber = String(this.invoiceNumber).trim().toUpperCase();
  }

  // 2. Default dueDate if missing (14 days after issueDate)
  if (!this.dueDate) {
    const baseDate = this.issueDate ? new Date(this.issueDate) : new Date();
    this.dueDate = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  }

  // 3. Line items auto-calculation
  if (Array.isArray(this.items) && this.items.length > 0) {
    let computedSubtotal = 0;
    this.items.forEach((item) => {
      const qty =
        item.quantity !== undefined && !isNaN(Number(item.quantity))
          ? Number(item.quantity)
          : 1;
      const price =
        item.unitPrice !== undefined && !isNaN(Number(item.unitPrice))
          ? Number(item.unitPrice)
          : 0;
      item.quantity = qty;
      item.unitPrice = price;
      item.amount = Number((qty * price).toFixed(2));
      computedSubtotal += item.amount;
    });

    // 4. Totals computation if missing or ensure accuracy
    if (this.subtotal === undefined || this.subtotal === null || isNaN(this.subtotal)) {
      this.subtotal = Number(computedSubtotal.toFixed(2));
    }

    const rate = Number(this.taxRate) || 0;
    if (this.taxAmount === undefined || this.taxAmount === null || isNaN(this.taxAmount)) {
      this.taxAmount = Number(((this.subtotal * rate) / 100).toFixed(2));
    }

    const discountVal = Number(this.discount) || 0;
    if (this.totalAmount === undefined || this.totalAmount === null || isNaN(this.totalAmount)) {
      this.totalAmount = Math.max(0, Number((this.subtotal + this.taxAmount - discountVal).toFixed(2)));
    }
  }

  // 5. Auto paidAt timestamp
  if (this.status === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
});

/**
 * Static method to generate formatted unique invoice number
 */
invoiceSchema.statics.generateInvoiceNumber = async function (prefix = 'INV') {
  const year = new Date().getFullYear();
  let count = 0;
  if (this.db && this.db.readyState === 1) {
    try {
      count = await this.countDocuments();
    } catch {
      count = Math.floor(1 + Math.random() * 999);
    }
  } else {
    count = Math.floor(1 + Math.random() * 999);
  }
  const paddedIndex = String(count + 1).padStart(4, '0');
  const randomSalt = Math.floor(10 + Math.random() * 90);
  return `${prefix}-${year}-${paddedIndex}${randomSalt}`;
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
