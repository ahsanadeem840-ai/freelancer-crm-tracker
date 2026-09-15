const { Notification } = require('../models');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private (Din 12 & 13)
const getNotifications = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Notifications & Socket.io events endpoint ready. Scheduled for Din 12 & 13.',
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
};
