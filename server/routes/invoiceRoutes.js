const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  generateInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getInvoiceStats,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * All invoice management endpoints require authentication and
 * CRM billing management permissions ('admin', 'agency_owner', or 'freelancer').
 * Users with 'client' role cannot access these endpoints.
 */
router.use(protect);
router.use(authorize('admin', 'agency_owner', 'freelancer'));

// Financial analytics stats (registered before /:id to prevent route collision)
router.get('/stats', getInvoiceStats);

// Dedicated generate alias
router.post('/generate', generateInvoice);

// Collection endpoints: List & Create
router
  .route('/')
  .get(getInvoices)
  .post(createInvoice);

// Quick status transition endpoint
router.patch('/:id/status', updateInvoiceStatus);

// Individual resource endpoints: Get by ID, Update (PUT/PATCH), Delete
router
  .route('/:id')
  .get(getInvoiceById)
  .put(updateInvoice)
  .patch(updateInvoice)
  .delete(deleteInvoice);

module.exports = router;
