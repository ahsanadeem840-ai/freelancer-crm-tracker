const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID (owner) is required'],
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Parent project ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in_progress', 'in_review', 'done'],
        message: '{VALUE} is not a valid task status',
      },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: [0, 'Estimated hours cannot be negative'],
      default: 0,
    },
    actualHours: {
      type: Number,
      min: [0, 'Actual hours cannot be negative'],
      default: 0,
    },
    order: {
      type: Number,
      default: 0, // Kanban drag-and-drop position ordering
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
taskSchema.index({ projectId: 1, status: 1, order: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

// Auto-sync isCompleted boolean when status is 'done'
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.isCompleted = this.status === 'done';
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
