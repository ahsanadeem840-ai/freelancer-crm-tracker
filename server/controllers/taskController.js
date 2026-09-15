const { Task } = require('../models');

// @desc    Get all tasks for a project / user Kanban
// @route   GET /api/tasks
// @access  Private (Din 9)
const getTasks = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Kanban Tasks API endpoint ready. Full drag-and-drop task API scheduled for Din 9.',
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
};
