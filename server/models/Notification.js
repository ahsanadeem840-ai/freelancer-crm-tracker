const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required for notification'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: {
      values: ['invoice', 'task', 'project', 'client', 'system'],
      message: '{VALUE} is not a valid notification type',
    },
    default: 'system',
  },
  link: {
    type: String,
    trim: true,
    default: '',
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000, // 30 days TTL (Time-To-Live) index in seconds (30 * 24 * 60 * 60)
  },
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
