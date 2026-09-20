const mongoose = require('mongoose');
const { Client } = require('../models');

// Email regex pattern for validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Allowed client pipeline statuses
const ALLOWED_STATUSES = ['lead', 'prospect', 'active', 'inactive'];

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ============================================================================
// 1. Get all clients for logged-in user (with search, filter, sort & pagination)
// ============================================================================
// @desc    Get all clients (Multi-tenant)
// @route   GET /api/clients
// @access  Private (admin, agency_owner, freelancer)
const getClients = async (req, res, next) => {
  try {
    const filter = {};

    // Multi-tenancy: Regular users can only access their own clients
    if (req.user.role === 'admin') {
      // If admin specifies a userId query parameter, filter by that user
      if (req.query.userId && isValidObjectId(req.query.userId)) {
        filter.userId = req.query.userId;
      }
    } else {
      filter.userId = req.user._id;
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

    // Tag filter
    if (req.query.tag) {
      filter.tags = String(req.query.tag).trim();
    }

    // Search filter across name, company, and email
    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search).trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex },
      ];
    }

    // Pagination parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sort = req.query.sort || '-createdAt';

    // Execute query and total count in parallel
    const [total, clients] = await Promise.all([
      Client.countDocuments(filter),
      Client.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    ]);

    res.status(200).json({
      success: true,
      count: clients.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: clients,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 2. Get single client details by ID
// ============================================================================
// @desc    Get client by ID
// @route   GET /api/clients/:id
// @access  Private (admin, agency_owner, freelancer)
const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid client ID format: ${id}`,
      });
    }

    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization: Non-admin can only access own clients
    if (
      req.user.role !== 'admin' &&
      String(client.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this client.',
      });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 3. Create a new client
// ============================================================================
// @desc    Create a new client
// @route   POST /api/clients
// @access  Private (admin, agency_owner, freelancer)
const createClient = async (req, res, next) => {
  try {
    const {
      name,
      email,
      company,
      phone,
      website,
      address,
      status,
      currency,
      notes,
      tags,
    } = req.body;

    // 1. Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide client contact name and email address',
      });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).toLowerCase().trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Client contact name cannot be empty',
      });
    }

    // 2. Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid client email address',
      });
    }

    // 3. Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `'${status}' is not a valid status. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    // 4. Duplicate check within the user's workspace
    const targetUserId =
      req.user.role === 'admin' && req.body.userId && isValidObjectId(req.body.userId)
        ? req.body.userId
        : req.user._id;

    const existingClient = await Client.findOne({
      userId: targetUserId,
      email: trimmedEmail,
    });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: `A client with email '${trimmedEmail}' already exists in your workspace.`,
      });
    }

    // 5. Create new client record
    const client = await Client.create({
      userId: targetUserId,
      name: trimmedName,
      email: trimmedEmail,
      company: company ? String(company).trim() : '',
      phone: phone ? String(phone).trim() : '',
      website: website ? String(website).trim() : '',
      address: address || {},
      status: status || 'lead',
      currency: currency ? String(currency).trim().toUpperCase() : 'USD',
      notes: notes ? String(notes).trim() : '',
      tags: Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean)
        : tags
        ? [String(tags).trim()]
        : [],
    });

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 4. Update an existing client
// ============================================================================
// @desc    Update client details
// @route   PUT /api/clients/:id, PATCH /api/clients/:id
// @access  Private (admin, agency_owner, freelancer)
const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid client ID format: ${id}`,
      });
    }

    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    if (
      req.user.role !== 'admin' &&
      String(client.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this client.',
      });
    }

    // Validate email if being updated
    if (req.body.email !== undefined) {
      const trimmedEmail = String(req.body.email).toLowerCase().trim();
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid client email address',
        });
      }

      // Check if duplicate email exists for this same user workspace
      const duplicateClient = await Client.findOne({
        userId: client.userId,
        email: trimmedEmail,
        _id: { $ne: client._id },
      });

      if (duplicateClient) {
        return res.status(400).json({
          success: false,
          message: `Another client with email '${trimmedEmail}' already exists in your workspace.`,
        });
      }

      client.email = trimmedEmail;
    }

    // Validate status if being updated
    if (req.body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: `'${req.body.status}' is not a valid status. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}`,
        });
      }
      client.status = req.body.status;
    }

    // Update fields if provided
    if (req.body.name !== undefined) {
      const trimmedName = String(req.body.name).trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: 'Client contact name cannot be empty',
        });
      }
      client.name = trimmedName;
    }

    if (req.body.company !== undefined) {
      client.company = String(req.body.company).trim();
    }

    if (req.body.phone !== undefined) {
      client.phone = String(req.body.phone).trim();
    }

    if (req.body.website !== undefined) {
      client.website = String(req.body.website).trim();
    }

    if (req.body.address !== undefined && typeof req.body.address === 'object') {
      client.address = {
        street: req.body.address.street ?? client.address?.street ?? '',
        city: req.body.address.city ?? client.address?.city ?? '',
        state: req.body.address.state ?? client.address?.state ?? '',
        zip: req.body.address.zip ?? client.address?.zip ?? '',
        country: req.body.address.country ?? client.address?.country ?? '',
      };
    }

    if (req.body.currency !== undefined) {
      client.currency = String(req.body.currency).trim().toUpperCase();
    }

    if (req.body.notes !== undefined) {
      client.notes = String(req.body.notes).trim();
    }

    if (req.body.tags !== undefined) {
      client.tags = Array.isArray(req.body.tags)
        ? req.body.tags.map((t) => String(t).trim()).filter(Boolean)
        : [String(req.body.tags).trim()];
    }

    // Save with Mongoose validation rules
    await client.save();

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 5. Delete a client
// ============================================================================
// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private (admin, agency_owner, freelancer)
const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid client ID format: ${id}`,
      });
    }

    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client not found with id: ${id}`,
      });
    }

    // Multi-tenancy authorization check
    if (
      req.user.role !== 'admin' &&
      String(client.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this client.',
      });
    }

    await client.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Client deleted successfully',
      data: {
        id: client._id,
        name: client.name,
        email: client.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 6. Client Pipeline Statistics (Summary metrics)
// ============================================================================
// @desc    Get client counts by status and billing overview
// @route   GET /api/clients/stats
// @access  Private (admin, agency_owner, freelancer)
const getClientStats = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'admin') {
      if (req.query.userId && isValidObjectId(req.query.userId)) {
        filter.userId = new mongoose.Types.ObjectId(req.query.userId);
      }
    } else {
      filter.userId = new mongoose.Types.ObjectId(req.user._id);
    }

    // Run parallel counts and aggregate financials
    const [total, leads, prospects, active, inactive, financialAggregation] =
      await Promise.all([
        Client.countDocuments(filter),
        Client.countDocuments({ ...filter, status: 'lead' }),
        Client.countDocuments({ ...filter, status: 'prospect' }),
        Client.countDocuments({ ...filter, status: 'active' }),
        Client.countDocuments({ ...filter, status: 'inactive' }),
        Client.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              totalBilled: { $sum: '$totalBilled' },
              totalPaid: { $sum: '$totalPaid' },
            },
          },
        ]),
      ]);

    const totalBilled = financialAggregation[0]?.totalBilled || 0;
    const totalPaid = financialAggregation[0]?.totalPaid || 0;
    const balanceOutstanding = totalBilled - totalPaid;

    res.status(200).json({
      success: true,
      data: {
        total,
        leads,
        prospects,
        active,
        inactive,
        financials: {
          totalBilled,
          totalPaid,
          balanceOutstanding,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
};
