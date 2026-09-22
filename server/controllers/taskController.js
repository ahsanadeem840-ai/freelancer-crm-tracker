const mongoose = require('mongoose');
const { Task, Project } = require('../models');

// Allowed enums matching Task schema
const ALLOWED_STATUSES = ['todo', 'in_progress', 'in_review', 'done'];
const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ============================================================================
// 1. Get all tasks for logged-in user (with multi-tenancy, project filter,
//    status/priority filter, search, sort & pagination)
// ============================================================================
// @desc    Get all tasks (Multi-tenant)
// @route   GET /api/tasks
// @access  Private (admin, agency_owner, freelancer)
const getTasks = async (req, res, next) => {
  try {
    const filter = {};

    // Multi-tenancy: Regular users can only access their own tasks
    if (req.user.role === 'admin') {
      if (req.query.userId && isValidObjectId(req.query.userId)) {
        filter.userId = req.query.userId;
      }
    } else {
      filter.userId = req.user._id;
    }

    // Project Relationship Filter (?projectId=...)
    if (req.query.projectId) {
      if (!isValidObjectId(req.query.projectId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid project ID format: ${req.query.projectId}`,
        });
      }
      filter.projectId = req.query.projectId;
    }

    // Status filter (?status=todo | in_progress | in_review | done)
    if (req.query.status) {
      if (ALLOWED_STATUSES.includes(req.query.status)) {
        filter.status = req.query.status;
      } else {
        return res.status(400).json({
          success: false,
          message: `'${req.query.status}' is not a valid status filter. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
        });
      }
    }

    // Priority filter (?priority=low | medium | high | urgent)
    if (req.query.priority) {
      if (ALLOWED_PRIORITIES.includes(req.query.priority)) {
        filter.priority = req.query.priority;
      } else {
        return res.status(400).json({
          success: false,
          message: `'${req.query.priority}' is not a valid priority filter. Allowed values: ${ALLOWED_PRIORITIES.join(', ')}`,
        });
      }
    }

    // Completion filter (?isCompleted=true | false)
    if (req.query.isCompleted !== undefined) {
      filter.isCompleted = req.query.isCompleted === 'true';
    }

    // Tag filter (?tag=...)
    if (req.query.tag) {
      filter.tags = String(req.query.tag).trim();
    }

    // Search filter across task title and description
    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search).trim(), 'i');
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Kanban support: if ?all=true or ?limit=0, fetch all matching tasks without strict pagination
    const isFetchAll = req.query.all === 'true' || req.query.limit === '0';

    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isFetchAll
      ? 500
      : Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = isFetchAll ? 0 : (page - 1) * limit;

    // Sorting: default by column order ascending, then newest first
    const sort = req.query.sort || 'order -createdAt';

    // Execute query and total count in parallel
    const [total, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter)
        .populate('projectId', 'title status priority clientId')
        .populate('userId', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page: isFetchAll ? 1 : page,
      pages: isFetchAll ? 1 : Math.ceil(total / limit) || 1,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 2. Get single task details by ID
// ============================================================================
// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private (admin, agency_owner, freelancer)
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID format: ${id}`,
      });
    }

    const task = await Task.findById(id)
      .populate('projectId', 'title status priority clientId')
      .populate('userId', 'name email role');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    const taskOwnerId = task.userId?._id
      ? String(task.userId._id)
      : String(task.userId);

    if (req.user.role !== 'admin' && taskOwnerId !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task.',
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 3. Create a new task (Linked with Parent Project)
// ============================================================================
// @desc    Create a new task linked to a Project
// @route   POST /api/tasks
// @access  Private (admin, agency_owner, freelancer)
const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      projectId,
      status,
      priority,
      dueDate,
      estimatedHours,
      actualHours,
      order,
      tags,
    } = req.body;

    // 1. Validate required fields
    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required',
      });
    }

    if (String(title).trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Task title cannot exceed 200 characters',
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Parent project ID is required to link task with a project',
      });
    }

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project ID format: ${projectId}`,
      });
    }

    // 2. Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `'${status}' is not a valid task status. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    // 3. Validate priority if provided
    if (priority && !ALLOWED_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `'${priority}' is not a valid priority. Allowed priorities: ${ALLOWED_PRIORITIES.join(', ')}`,
      });
    }

    // 4. Validate numeric hours
    const parsedEstimated =
      estimatedHours !== undefined ? Number(estimatedHours) : 0;
    if (isNaN(parsedEstimated) || parsedEstimated < 0) {
      return res.status(400).json({
        success: false,
        message: 'Estimated hours must be a non-negative number',
      });
    }

    const parsedActual = actualHours !== undefined ? Number(actualHours) : 0;
    if (isNaN(parsedActual) || parsedActual < 0) {
      return res.status(400).json({
        success: false,
        message: 'Actual hours must be a non-negative number',
      });
    }

    // 5. Parent Project Relationship & Multi-Tenant Verification
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Project not found with id: ${projectId}`,
      });
    }

    // Regular users can only attach tasks to their own projects
    if (
      req.user.role !== 'admin' &&
      String(project.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized: Project does not belong to your workspace.',
      });
    }

    // Target user owner of this task
    const targetUserId =
      req.user.role === 'admin' &&
      req.body.userId &&
      isValidObjectId(req.body.userId)
        ? req.body.userId
        : req.user.role === 'admin'
        ? project.userId
        : req.user._id;

    const finalStatus = status || 'todo';

    // 6. Compute Kanban column order if not specified
    let finalOrder = order !== undefined ? Number(order) : undefined;
    if (finalOrder === undefined || isNaN(finalOrder)) {
      const highestOrderTask = await Task.findOne({
        projectId: project._id,
        status: finalStatus,
      })
        .sort('-order')
        .select('order')
        .lean();
      finalOrder =
        highestOrderTask && typeof highestOrderTask.order === 'number'
          ? highestOrderTask.order + 1
          : 0;
    }

    // 7. Create new task record
    const task = await Task.create({
      userId: targetUserId,
      projectId: project._id,
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      status: finalStatus,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours: parsedEstimated,
      actualHours: parsedActual,
      order: finalOrder,
      isCompleted: finalStatus === 'done',
      tags: Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean)
        : tags
        ? [String(tags).trim()]
        : [],
    });

    // Populate project details for response
    const populatedTask = await Task.findById(task._id)
      .populate('projectId', 'title status priority clientId')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 4. Update an existing task
// ============================================================================
// @desc    Update task details (status transitions, priority, hours, drag-and-drop order)
// @route   PUT /api/tasks/:id, PATCH /api/tasks/:id
// @access  Private (admin, agency_owner, freelancer)
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID format: ${id}`,
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    if (
      req.user.role !== 'admin' &&
      String(task.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task.',
      });
    }

    // If changing parent project link, verify new project existence and workspace ownership
    if (req.body.projectId !== undefined) {
      if (!isValidObjectId(req.body.projectId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid project ID format: ${req.body.projectId}`,
        });
      }

      const newProject = await Project.findById(req.body.projectId);
      if (!newProject) {
        return res.status(404).json({
          success: false,
          message: `Project not found with id: ${req.body.projectId}`,
        });
      }

      if (
        req.user.role !== 'admin' &&
        String(newProject.userId) !== String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Not authorized: Target project does not belong to your workspace.',
        });
      }

      task.projectId = newProject._id;
    }

    // Validate and update title
    if (req.body.title !== undefined) {
      const trimmedTitle = String(req.body.title).trim();
      if (!trimmedTitle) {
        return res.status(400).json({
          success: false,
          message: 'Task title cannot be empty',
        });
      }
      if (trimmedTitle.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Task title cannot exceed 200 characters',
        });
      }
      task.title = trimmedTitle;
    }

    // Update description
    if (req.body.description !== undefined) {
      task.description = String(req.body.description).trim();
    }

    // Validate and update status
    if (req.body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: `'${req.body.status}' is not a valid status. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`,
        });
      }

      task.status = req.body.status;
      task.isCompleted = req.body.status === 'done';
    }

    // Explicit completion toggle (if status not passed)
    if (req.body.isCompleted !== undefined && req.body.status === undefined) {
      task.isCompleted = Boolean(req.body.isCompleted);
      if (task.isCompleted && task.status !== 'done') {
        task.status = 'done';
      } else if (!task.isCompleted && task.status === 'done') {
        task.status = 'todo';
      }
    }

    // Validate and update priority
    if (req.body.priority !== undefined) {
      if (!ALLOWED_PRIORITIES.includes(req.body.priority)) {
        return res.status(400).json({
          success: false,
          message: `'${req.body.priority}' is not a valid priority. Allowed priorities: ${ALLOWED_PRIORITIES.join(', ')}`,
        });
      }
      task.priority = req.body.priority;
    }

    // Update dueDate
    if (req.body.dueDate !== undefined) {
      task.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : undefined;
    }

    // Validate and update estimatedHours
    if (req.body.estimatedHours !== undefined) {
      const parsedHours = Number(req.body.estimatedHours);
      if (isNaN(parsedHours) || parsedHours < 0) {
        return res.status(400).json({
          success: false,
          message: 'Estimated hours must be a non-negative number',
        });
      }
      task.estimatedHours = parsedHours;
    }

    // Validate and update actualHours
    if (req.body.actualHours !== undefined) {
      const parsedHours = Number(req.body.actualHours);
      if (isNaN(parsedHours) || parsedHours < 0) {
        return res.status(400).json({
          success: false,
          message: 'Actual hours must be a non-negative number',
        });
      }
      task.actualHours = parsedHours;
    }

    // Update order (position within Kanban column)
    if (req.body.order !== undefined) {
      const parsedOrder = Number(req.body.order);
      if (isNaN(parsedOrder)) {
        return res.status(400).json({
          success: false,
          message: 'Order must be a valid number',
        });
      }
      task.order = parsedOrder;
    }

    // Update tags
    if (req.body.tags !== undefined) {
      task.tags = Array.isArray(req.body.tags)
        ? req.body.tags.map((t) => String(t).trim()).filter(Boolean)
        : [String(req.body.tags).trim()];
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('projectId', 'title status priority clientId')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 5. Delete a task
// ============================================================================
// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (admin, agency_owner, freelancer)
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID format: ${id}`,
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    if (
      req.user.role !== 'admin' &&
      String(task.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task.',
      });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: {
        id: task._id,
        title: task.title,
        projectId: task.projectId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 6. Batch Reorder Tasks (Kanban drag-and-drop column/position updater)
// ============================================================================
// @desc    Batch reorder task positions & column statuses for interactive Kanban board
// @route   PUT /api/tasks/reorder
// @access  Private (admin, agency_owner, freelancer)
const reorderTasks = async (req, res, next) => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty array of tasks is required for reordering.',
      });
    }

    // Validate payload entries
    for (const item of tasks) {
      if (!item.id || !isValidObjectId(item.id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid task ID format in reorder list: ${item.id}`,
        });
      }
      if (item.status && !ALLOWED_STATUSES.includes(item.status)) {
        return res.status(400).json({
          success: false,
          message: `'${item.status}' is not a valid status in reorder payload.`,
        });
      }
      if (
        item.order !== undefined &&
        (isNaN(Number(item.order)) || Number(item.order) < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `Order must be a non-negative number for task: ${item.id}`,
        });
      }
    }

    const taskIds = tasks.map((t) => t.id);

    // Multi-tenancy ownership check: ensure all target tasks belong to the user
    const existingTasks = await Task.find({ _id: { $in: taskIds } }).select(
      '_id userId'
    );

    if (existingTasks.length !== taskIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more tasks in the reorder payload were not found.',
      });
    }

    if (req.user.role !== 'admin') {
      const unauthorizedTask = existingTasks.find(
        (t) => String(t.userId) !== String(req.user._id)
      );
      if (unauthorizedTask) {
        return res.status(403).json({
          success: false,
          message:
            'Not authorized: One or more tasks do not belong to your workspace.',
        });
      }
    }

    // Perform bulk updates
    const bulkOps = tasks.map((item) => {
      const updateFields = {};
      if (item.status !== undefined) {
        updateFields.status = item.status;
        updateFields.isCompleted = item.status === 'done';
      }
      if (item.order !== undefined) {
        updateFields.order = Number(item.order);
      }

      return {
        updateOne: {
          filter: { _id: item.id },
          update: { $set: updateFields },
        },
      };
    });

    await Task.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: `Successfully reordered ${tasks.length} tasks`,
      count: tasks.length,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 7. Task Pipeline Statistics & Productivity Metrics
// ============================================================================
// @desc    Get task status breakdown, priority counts, completion rate & hours
// @route   GET /api/tasks/stats
// @access  Private (admin, agency_owner, freelancer)
const getTaskStats = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'admin') {
      if (req.query.userId && isValidObjectId(req.query.userId)) {
        filter.userId = new mongoose.Types.ObjectId(req.query.userId);
      }
    } else {
      filter.userId = new mongoose.Types.ObjectId(req.user._id);
    }

    // Optional project-level scoping
    if (req.query.projectId) {
      if (!isValidObjectId(req.query.projectId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid project ID format: ${req.query.projectId}`,
        });
      }
      filter.projectId = new mongoose.Types.ObjectId(req.query.projectId);
    }

    const now = new Date();

    const [
      total,
      todo,
      in_progress,
      in_review,
      done,
      lowPriority,
      mediumPriority,
      highPriority,
      urgentPriority,
      overdueTasks,
      hoursAggregation,
    ] = await Promise.all([
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: 'todo' }),
      Task.countDocuments({ ...filter, status: 'in_progress' }),
      Task.countDocuments({ ...filter, status: 'in_review' }),
      Task.countDocuments({ ...filter, status: 'done' }),
      Task.countDocuments({ ...filter, priority: 'low' }),
      Task.countDocuments({ ...filter, priority: 'medium' }),
      Task.countDocuments({ ...filter, priority: 'high' }),
      Task.countDocuments({ ...filter, priority: 'urgent' }),
      Task.countDocuments({
        ...filter,
        status: { $ne: 'done' },
        dueDate: { $lt: now },
      }),
      Task.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEstimatedHours: { $sum: '$estimatedHours' },
            totalActualHours: { $sum: '$actualHours' },
          },
        },
      ]),
    ]);

    const totalEstimatedHours =
      hoursAggregation[0]?.totalEstimatedHours || 0;
    const totalActualHours = hoursAggregation[0]?.totalActualHours || 0;
    const completionRate =
      total > 0 ? Math.round((done / total) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        total,
        statusBreakdown: {
          todo,
          in_progress,
          in_review,
          done,
        },
        priorityBreakdown: {
          low: lowPriority,
          medium: mediumPriority,
          high: highPriority,
          urgent: urgentPriority,
        },
        productivity: {
          completed: done,
          pending: total - done,
          completionRate,
          overdue: overdueTasks,
          totalEstimatedHours,
          totalActualHours,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getTaskStats,
};
