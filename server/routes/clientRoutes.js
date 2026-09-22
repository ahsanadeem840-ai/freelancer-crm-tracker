const express = require('express');
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
  getClientProjects,
} = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * All client management routes require an authenticated user with
 * permissions to manage CRM clients ('admin', 'agency_owner', or 'freelancer').
 * Users with 'client' role cannot access these endpoints.
 */
router.use(protect);
router.use(authorize('admin', 'agency_owner', 'freelancer'));

// Pipeline summary stats (registered before /:id to prevent route collision)
router.get('/stats', getClientStats);

// Collection endpoints: List & Create
router
  .route('/')
  .get(getClients)
  .post(createClient);

// Client Projects relationship endpoint (registered before /:id to prevent ambiguity)
router.get('/:id/projects', getClientProjects);

// Individual resource endpoints: Get by ID, Update (PUT/PATCH), Delete
router
  .route('/:id')
  .get(getClientById)
  .put(updateClient)
  .patch(updateClient)
  .delete(deleteClient);

module.exports = router;
