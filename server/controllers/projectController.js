const { Project } = require('../models');

// @desc    Get all projects for logged-in user
// @route   GET /api/projects
// @access  Private (Din 8)
const getProjects = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Projects API endpoint ready. Full Project Tracker will be finalized in Din 8.',
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
};
