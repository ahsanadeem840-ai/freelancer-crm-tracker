const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID (owner) is required'],
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [150, 'Project title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: [
          'planning',
          'in_progress',
          'in_review',
          'completed',
          'cancelled',
          'on_hold',
        ],
        message: '{VALUE} is not a valid project status',
      },
      default: 'planning',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'medium',
    },
    pricingType: {
      type: String,
      enum: {
        values: ['fixed', 'hourly'],
        message: '{VALUE} is not a valid pricing type',
      },
      default: 'fixed',
    },
    budget: {
      type: Number,
      required: [true, 'Project budget is required'],
      min: [0, 'Budget cannot be negative'],
      default: 0,
    },
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate cannot be negative'],
      default: 0,
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ clientId: 1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
