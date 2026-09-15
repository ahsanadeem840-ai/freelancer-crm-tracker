const { Invoice } = require('../models');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (Din 10 & 11)
const getInvoices = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Invoices & Stripe billing endpoint ready. Scheduled for Din 10 & 11.',
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
};
