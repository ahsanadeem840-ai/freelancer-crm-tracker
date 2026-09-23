const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
  getProjectTasks,
  getProjectInvoices,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * All project management routes require an authenticated user with
 * permissions to manage projects ('admin', 'agency_owner', or 'freelancer').
 * Users with 'client' role cannot access these endpoints.
 */
router.use(protect);
router.use(authorize('admin', 'agency_owner', 'freelancer'));

// Project pipeline analytics & financial stats (registered before /:id to prevent route collision)
router.get('/stats', getProjectStats);

// Collection endpoints: List & Create
router
  .route('/')
  .get(getProjects)
  .post(createProject);

// Project Tasks & Invoices relationship endpoints (registered before /:id to prevent ambiguity)
router.get('/:id/tasks', getProjectTasks);
router.get('/:id/invoices', getProjectInvoices);

// Individual resource endpoints: Get by ID, Update (PUT/PATCH), Delete
router
  .route('/:id')
  .get(getProjectById)
  .put(updateProject)
  .patch(updateProject)
  .delete(deleteProject);

module.exports = router;
