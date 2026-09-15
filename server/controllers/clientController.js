const { Client } = require('../models');

// @desc    Get all clients for logged-in user
// @route   GET /api/clients
// @access  Private (Din 7)
const getClients = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Client CRM API endpoint ready. Full CRUD will be finalized in Din 7.',
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new client
// @route   POST /api/clients
// @access  Private (Din 7)
const createClient = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Create Client endpoint will be implemented in Din 7',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClients,
  createClient,
};
