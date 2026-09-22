const mongoose = require('mongoose');
const { Project, Client, Task } = require('../models');

// Allowed enums matching Project schema
const ALLOWED_STATUSES = [
  'planning',
  'in_progress',
  'in_review',
  'completed',
  'cancelled',
  'on_hold',
];

const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ALLOWED_PRICING_TYPES = ['fixed', 'hourly'];

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ============================================================================
// 1. Get all projects for logged-in user (with multi-tenancy, search, filter,
//    client-linking, sort & pagination)
// ============================================================================
// @desc    Get all projects (Multi-tenant)
// @route   GET /api/projects
// @access  Private (admin, agency_owner, freelancer)
const getProjects = async (req, res, next) => {
  try {
    const filter = {};

    // Multi-tenancy: Regular users can only access their own projects
    if (req.user.role === 'admin') {
      if (req.query.userId && isValidObjectId(req.query.userId)) {
        filter.userId = req.query.userId;
      }
    } else {
      filter.userId = req.user._id;
    }

    // Client Relationship Filter (?clientId=...)
    if (req.query.clientId) {
      if (!isValidObjectId(req.query.clientId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid client ID format: ${req.query.clientId}`,
        });
      }
      filter.clientId = req.query.clientId;
    }

    // Status filter
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

    // Priority filter
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

    // Pricing type filter
    if (req.query.pricingType) {
      if (ALLOWED_PRICING_TYPES.includes(req.query.pricingType)) {
        filter.pricingType = req.query.pricingType;
      } else {
        return res.status(400).json({
          success: false,
          message: `'${req.query.pricingType}' is not a valid pricingType filter. Allowed values: ${ALLOWED_PRICING_TYPES.join(', ')}`,
        });
      }
    }

    // Tag filter
    if (req.query.tag) {
      filter.tags = String(req.query.tag).trim();
    }

    // Search filter across project title and description
    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search).trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
      ];
    }

    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sort = req.query.sort || '-createdAt';

    // Execute query and total count in parallel
    const [total, projects] = await Promise.all([
      Project.countDocuments(filter),
      Project.find(filter)
        .populate('clientId', 'name company email phone status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 2. Get single project details by ID (with populated Client & Owner)
// ============================================================================
// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private (admin, agency_owner, freelancer)
const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project ID format: ${id}`,
      });
    }

    const project = await Project.findById(id)
      .populate('clientId', 'name email company phone website address status currency')
      .populate('userId', 'name email role');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Project not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    const projectOwnerId = project.userId?._id
      ? String(project.userId._id)
      : String(project.userId);

    if (req.user.role !== 'admin' && projectOwnerId !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project.',
      });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 3. Create a new project (Linked with Client)
// ============================================================================
// @desc    Create a new project linked to a Client
// @route   POST /api/projects
// @access  Private (admin, agency_owner, freelancer)
const createProject = async (req, res, next) => {
  try {
    const {
      title,
      description,
      clientId,
      status,
      priority,
      pricingType,
      budget,
      hourlyRate,
      startDate,
      dueDate,
      completedAt,
      attachments,
      tags,
    } = req.body;

    // 1. Validate required fields
    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project title is required',
      });
    }

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required to link project with a client',
      });
    }

    if (!isValidObjectId(clientId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid client ID format: ${clientId}`,
      });
    }

    // 2. Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `'${status}' is not a valid project status. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    // 3. Validate priority if provided
    if (priority && !ALLOWED_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `'${priority}' is not a valid priority. Allowed priorities: ${ALLOWED_PRIORITIES.join(', ')}`,
      });
    }

    // 4. Validate pricingType if provided
    if (pricingType && !ALLOWED_PRICING_TYPES.includes(pricingType)) {
      return res.status(400).json({
        success: false,
        message: `'${pricingType}' is not a valid pricing type. Allowed pricing types: ${ALLOWED_PRICING_TYPES.join(', ')}`,
      });
    }

    // 5. Validate budget / hourlyRate numeric values
    const parsedBudget = budget !== undefined ? Number(budget) : 0;
    if (isNaN(parsedBudget) || parsedBudget < 0) {
      return res.status(400).json({
        success: false,
        message: 'Budget must be a non-negative number',
      });
    }

    const parsedHourlyRate = hourlyRate !== undefined ? Number(hourlyRate) : 0;
    if (isNaN(parsedHourlyRate) || parsedHourlyRate < 0) {
      return res.status(400).json({
        success: false,
        message: 'Hourly rate must be a non-negative number',
      });
    }

    // 6. Client Relationship & Multi-Tenant Verification
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client not found with id: ${clientId}`,
      });
    }

    // Regular users can only attach projects to their own clients
    if (
      req.user.role !== 'admin' &&
      String(client.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized: Client does not belong to your workspace.',
      });
    }

    // Target user owner of this project
    const targetUserId =
      req.user.role === 'admin' && req.body.userId && isValidObjectId(req.body.userId)
        ? req.body.userId
        : req.user.role === 'admin'
        ? client.userId
        : req.user._id;

    // 7. Auto-compute completedAt if status is completed
    const finalStatus = status || 'planning';
    let finalCompletedAt = completedAt ? new Date(completedAt) : undefined;
    if (finalStatus === 'completed' && !finalCompletedAt) {
      finalCompletedAt = new Date();
    }

    // 8. Create new project record
    const project = await Project.create({
      userId: targetUserId,
      clientId: client._id,
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      status: finalStatus,
      priority: priority || 'medium',
      pricingType: pricingType || 'fixed',
      budget: parsedBudget,
      hourlyRate: parsedHourlyRate,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      completedAt: finalCompletedAt,
      attachments: Array.isArray(attachments) ? attachments : [],
      tags: Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean)
        : tags
        ? [String(tags).trim()]
        : [],
    });

    // Populate client details for the response
    const populatedProject = await Project.findById(project._id)
      .populate('clientId', 'name company email phone status')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 4. Update an existing project
// ============================================================================
// @desc    Update project details
// @route   PUT /api/projects/:id, PATCH /api/projects/:id
// @access  Private (admin, agency_owner, freelancer)
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project ID format: ${id}`,
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Project not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    if (
      req.user.role !== 'admin' &&
      String(project.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project.',
      });
    }

    // If changing client link, verify new client existence and ownership
    if (req.body.clientId !== undefined) {
      if (!isValidObjectId(req.body.clientId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid client ID format: ${req.body.clientId}`,
        });
      }

      const newClient = await Client.findById(req.body.clientId);
      if (!newClient) {
        return res.status(404).json({
          success: false,
          message: `Client not found with id: ${req.body.clientId}`,
        });
      }

      if (
        req.user.role !== 'admin' &&
        String(newClient.userId) !== String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized: Target client does not belong to your workspace.',
        });
      }

      project.clientId = newClient._id;
    }

    // Validate and update status
    if (req.body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: `'${req.body.status}' is not a valid status. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`,
        });
      }

      // Auto-update completedAt timestamp when transitioned to completed
      if (req.body.status === 'completed' && !project.completedAt) {
        project.completedAt = req.body.completedAt
          ? new Date(req.body.completedAt)
          : new Date();
      } else if (req.body.status !== 'completed' && project.status === 'completed') {
        // If moved back from completed to in_progress or review, reset completedAt unless explicitly specified
        project.completedAt = req.body.completedAt ? new Date(req.body.completedAt) : undefined;
      }

      project.status = req.body.status;
    }

    // Validate and update priority
    if (req.body.priority !== undefined) {
      if (!ALLOWED_PRIORITIES.includes(req.body.priority)) {
        return res.status(400).json({
          success: false,
          message: `'${req.body.priority}' is not a valid priority. Allowed priorities: ${ALLOWED_PRIORITIES.join(', ')}`,
        });
      }
      project.priority = req.body.priority;
    }

    // Validate and update pricingType
    if (req.body.pricingType !== undefined) {
      if (!ALLOWED_PRICING_TYPES.includes(req.body.pricingType)) {
        return res.status(400).json({
          success: false,
          message: `'${req.body.pricingType}' is not a valid pricing type. Allowed pricing types: ${ALLOWED_PRICING_TYPES.join(', ')}`,
        });
      }
      project.pricingType = req.body.pricingType;
    }

    // Update title
    if (req.body.title !== undefined) {
      const trimmedTitle = String(req.body.title).trim();
      if (!trimmedTitle) {
        return res.status(400).json({
          success: false,
          message: 'Project title cannot be empty',
        });
      }
      project.title = trimmedTitle;
    }

    // Update description
    if (req.body.description !== undefined) {
      project.description = String(req.body.description).trim();
    }

    // Update budget
    if (req.body.budget !== undefined) {
      const parsedBudget = Number(req.body.budget);
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        return res.status(400).json({
          success: false,
          message: 'Budget must be a non-negative number',
        });
      }
      project.budget = parsedBudget;
    }

    // Update hourlyRate
    if (req.body.hourlyRate !== undefined) {
      const parsedRate = Number(req.body.hourlyRate);
      if (isNaN(parsedRate) || parsedRate < 0) {
        return res.status(400).json({
          success: false,
          message: 'Hourly rate must be a non-negative number',
        });
      }
      project.hourlyRate = parsedRate;
    }

    // Update dates
    if (req.body.startDate !== undefined) {
      project.startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    }

    if (req.body.dueDate !== undefined) {
      project.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : undefined;
    }

    if (req.body.completedAt !== undefined) {
      project.completedAt = req.body.completedAt ? new Date(req.body.completedAt) : undefined;
    }

    // Update attachments
    if (req.body.attachments !== undefined && Array.isArray(req.body.attachments)) {
      project.attachments = req.body.attachments;
    }

    // Update tags
    if (req.body.tags !== undefined) {
      project.tags = Array.isArray(req.body.tags)
        ? req.body.tags.map((t) => String(t).trim()).filter(Boolean)
        : [String(req.body.tags).trim()];
    }

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('clientId', 'name company email phone status')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 5. Delete a project
// ============================================================================
// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (admin, agency_owner, freelancer)
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project ID format: ${id}`,
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Project not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    if (
      req.user.role !== 'admin' &&
      String(project.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project.',
      });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
      data: {
        id: project._id,
        title: project.title,
        clientId: project.clientId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 6. Project Pipeline Statistics & Financials Overview
// ============================================================================
// @desc    Get project counts by status, priority, and total budget
// @route   GET /api/projects/stats
// @access  Private (admin, agency_owner, freelancer)
const getProjectStats = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'admin') {
      if (req.query.userId && isValidObjectId(req.query.userId)) {
        filter.userId = new mongoose.Types.ObjectId(req.query.userId);
      }
    } else {
      filter.userId = new mongoose.Types.ObjectId(req.user._id);
    }

    // Parallel counts and aggregate financial calculations
    const [
      total,
      planning,
      in_progress,
      in_review,
      completed,
      cancelled,
      on_hold,
      lowPriority,
      mediumPriority,
      highPriority,
      urgentPriority,
      budgetAggregation,
    ] = await Promise.all([
      Project.countDocuments(filter),
      Project.countDocuments({ ...filter, status: 'planning' }),
      Project.countDocuments({ ...filter, status: 'in_progress' }),
      Project.countDocuments({ ...filter, status: 'in_review' }),
      Project.countDocuments({ ...filter, status: 'completed' }),
      Project.countDocuments({ ...filter, status: 'cancelled' }),
      Project.countDocuments({ ...filter, status: 'on_hold' }),
      Project.countDocuments({ ...filter, priority: 'low' }),
      Project.countDocuments({ ...filter, priority: 'medium' }),
      Project.countDocuments({ ...filter, priority: 'high' }),
      Project.countDocuments({ ...filter, priority: 'urgent' }),
      Project.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalBudget: { $sum: '$budget' },
            avgBudget: { $avg: '$budget' },
          },
        },
      ]),
    ]);

    const totalBudget = budgetAggregation[0]?.totalBudget || 0;
    const avgBudget = Math.round(budgetAggregation[0]?.avgBudget || 0);

    res.status(200).json({
      success: true,
      data: {
        total,
        statusBreakdown: {
          planning,
          in_progress,
          in_review,
          completed,
          cancelled,
          on_hold,
        },
        priorityBreakdown: {
          low: lowPriority,
          medium: mediumPriority,
          high: highPriority,
          urgent: urgentPriority,
        },
        financials: {
          totalBudget,
          avgBudget,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 7. Get all tasks for a specific project (Project -> Tasks relationship)
// ============================================================================
// @desc    Get all tasks linked to a project
// @route   GET /api/projects/:id/tasks
// @access  Private (admin, agency_owner, freelancer)
const getProjectTasks = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project ID format: ${id}`,
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Project not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    if (
      req.user.role !== 'admin' &&
      String(project.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access tasks for this project.',
      });
    }

    const filter = { projectId: project._id };
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const sort = req.query.sort || 'order -createdAt';
    const isFetchAll = req.query.all === 'true' || req.query.limit === '0';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isFetchAll
      ? 500
      : Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = isFetchAll ? 0 : (page - 1) * limit;

    const [total, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    ]);

    res.status(200).json({
      success: true,
      project: {
        _id: project._id,
        title: project.title,
        status: project.status,
        priority: project.priority,
      },
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

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
  getProjectTasks,
};
