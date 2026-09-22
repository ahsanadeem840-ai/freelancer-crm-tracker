const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getTaskStats,
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * All task management routes require an authenticated user with
 * permissions to manage tasks ('admin', 'agency_owner', or 'freelancer').
 * Users with 'client' role cannot access these endpoints.
 */
router.use(protect);
router.use(authorize('admin', 'agency_owner', 'freelancer'));

// Task pipeline analytics & productivity stats (registered before /:id to prevent route collision)
router.get('/stats', getTaskStats);

// Batch reorder Kanban column positions & statuses (registered before /:id to prevent route collision)
router.put('/reorder', reorderTasks);

// Collection endpoints: List & Create
router
  .route('/')
  .get(getTasks)
  .post(createTask);

// Individual resource endpoints: Get by ID, Update (PUT/PATCH), Delete
router
  .route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .patch(updateTask)
  .delete(deleteTask);

module.exports = router;
