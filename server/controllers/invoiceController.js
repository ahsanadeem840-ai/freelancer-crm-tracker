const mongoose = require('mongoose');
const { Invoice, Client, Project } = require('../models');

// Allowed status enums
const ALLOWED_STATUSES = [
  'draft',
  'sent',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled',
];

const ALLOWED_PAYMENT_METHODS = [
  'stripe',
  'bank_transfer',
  'paypal',
  'cash',
  'other',
];

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ============================================================================
// 1. Get all invoices (Multi-tenant, Filters, Search, Pagination)
// ============================================================================
// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (admin, agency_owner, freelancer)
const getInvoices = async (req, res, next) => {
  try {
    const filter = {};

    // Multi-tenancy: Regular users can only access their own issued invoices
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

    // Status filter (?status=draft | sent | paid | partially_paid | overdue | cancelled)
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

    // Search filter across invoiceNumber and notes
    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search).trim(), 'i');
      filter.$or = [{ invoiceNumber: searchRegex }, { notes: searchRegex }];
    }

    // Date range filtering on issueDate (?startDate=...&endDate=...)
    if (req.query.startDate || req.query.endDate) {
      filter.issueDate = {};
      if (req.query.startDate) {
        const start = new Date(req.query.startDate);
        if (!isNaN(start.getTime())) {
          filter.issueDate.$gte = start;
        }
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        if (!isNaN(end.getTime())) {
          filter.issueDate.$lte = end;
        }
      }
    }

    // Overdue filter (?isOverdue=true)
    if (req.query.isOverdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $nin: ['paid', 'cancelled'] };
    }

    const isFetchAll = req.query.all === 'true' || req.query.limit === '0';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isFetchAll
      ? 500
      : Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = isFetchAll ? 0 : (page - 1) * limit;

    const sort = req.query.sort || '-issueDate -createdAt';

    // Parallel fetch of count and records
    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter)
        .populate('clientId', 'name email company currency')
        .populate('projectId', 'title status priority')
        .populate('userId', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      page: isFetchAll ? 1 : page,
      pages: isFetchAll ? 1 : Math.ceil(total / limit) || 1,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 2. Get single invoice details by ID
// ============================================================================
// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private (admin, agency_owner, freelancer)
const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid invoice ID format: ${id}`,
      });
    }

    const invoice = await Invoice.findById(id)
      .populate('clientId', 'name email company phone address currency')
      .populate('projectId', 'title status budget')
      .populate('userId', 'name email role businessName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Invoice not found with id: ${id}`,
      });
    }

    // Multi-tenancy check
    const ownerId = invoice.userId?._id
      ? String(invoice.userId._id)
      : String(invoice.userId);

    if (req.user.role !== 'admin' && ownerId !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice.',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 3. Create / Generate a new invoice (Linked to Client & optional Project)
// ============================================================================
// @desc    Generate / Create an invoice
// @route   POST /api/invoices & POST /api/invoices/generate
// @access  Private (admin, agency_owner, freelancer)
const createInvoice = async (req, res, next) => {
  try {
    const {
      clientId,
      projectId,
      items,
      taxRate,
      discount,
      currency,
      status,
      issueDate,
      dueDate,
      notes,
      terms,
      invoiceNumber,
      paymentMethod,
    } = req.body;

    // 1. Validate Client ID format
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required to generate an invoice',
      });
    }

    if (!isValidObjectId(clientId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid client ID format: ${clientId}`,
      });
    }

    // 2. Validate Project ID format if provided
    if (projectId && !isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project ID format: ${projectId}`,
      });
    }

    // 3. Validate line items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'An invoice must contain at least one line item',
      });
    }

    const validatedItems = [];
    let computedSubtotal = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description || !String(item.description).trim()) {
        return res.status(400).json({
          success: false,
          message: `Line item at index ${i} is missing description`,
        });
      }

      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: `Line item at index ${i} must have quantity >= 1`,
        });
      }

      const unitPrice = Number(item.unitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `Line item at index ${i} must have non-negative unit price`,
        });
      }

      const amount = Number((quantity * unitPrice).toFixed(2));
      computedSubtotal += amount;

      validatedItems.push({
        description: String(item.description).trim(),
        quantity,
        unitPrice,
        amount,
      });
    }

    // 4. Validate tax rate and discount
    const parsedTaxRate = taxRate !== undefined ? Number(taxRate) : 0;
    if (isNaN(parsedTaxRate) || parsedTaxRate < 0) {
      return res.status(400).json({
        success: false,
        message: 'Tax rate must be a non-negative number',
      });
    }

    const parsedDiscount = discount !== undefined ? Number(discount) : 0;
    if (isNaN(parsedDiscount) || parsedDiscount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount must be a non-negative number',
      });
    }

    const taxAmount = Number(((computedSubtotal * parsedTaxRate) / 100).toFixed(2));
    const totalAmount = Math.max(
      0,
      Number((computedSubtotal + taxAmount - parsedDiscount).toFixed(2))
    );

    // 5. Status validation if provided
    const finalStatus = status || 'draft';
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `'${status}' is not a valid invoice status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    // 6. Payment method validation if provided
    if (paymentMethod && !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `'${paymentMethod}' is not a valid payment method. Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      });
    }

    // 7. Verify Client exists in DB
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client not found with id: ${clientId}`,
      });
    }

    // Multi-tenant check: Regular users can only invoice their own clients
    if (
      req.user.role !== 'admin' &&
      String(client.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized: Client does not belong to your workspace.',
      });
    }

    // 8. Verify Project in DB if provided
    let verifiedProjectId = undefined;
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: `Project not found with id: ${projectId}`,
        });
      }

      if (
        req.user.role !== 'admin' &&
        String(project.userId) !== String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized: Project does not belong to your workspace.',
        });
      }

      verifiedProjectId = project._id;
    }

    // 7. Determine User / Issuer
    const targetUserId =
      req.user.role === 'admin' &&
      req.body.userId &&
      isValidObjectId(req.body.userId)
        ? req.body.userId
        : req.user._id;

    // 8. Custom or Auto-generated invoice number
    let finalInvoiceNumber = invoiceNumber ? String(invoiceNumber).trim().toUpperCase() : null;
    if (finalInvoiceNumber) {
      const existing = await Invoice.findOne({ invoiceNumber: finalInvoiceNumber });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Invoice number '${finalInvoiceNumber}' already exists. Please provide a unique number.`,
        });
      }
    } else {
      finalInvoiceNumber = await Invoice.generateInvoiceNumber();
    }

    // 9. Due date calculation: defaults to issueDate + 14 days if not supplied
    const finalIssueDate = issueDate ? new Date(issueDate) : new Date();
    const finalDueDate = dueDate
      ? new Date(dueDate)
      : new Date(finalIssueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    // 10. Create Invoice record
    const invoice = await Invoice.create({
      invoiceNumber: finalInvoiceNumber,
      userId: targetUserId,
      clientId: client._id,
      projectId: verifiedProjectId,
      items: validatedItems,
      subtotal: Number(computedSubtotal.toFixed(2)),
      taxRate: parsedTaxRate,
      taxAmount,
      discount: parsedDiscount,
      totalAmount,
      currency: currency ? String(currency).trim().toUpperCase() : client.currency || 'USD',
      status: finalStatus,
      issueDate: finalIssueDate,
      dueDate: finalDueDate,
      paidAt: finalStatus === 'paid' ? new Date() : undefined,
      paymentMethod: paymentMethod || undefined,
      notes: notes ? String(notes).trim() : '',
      terms: terms ? String(terms).trim() : '',
    });

    // 11. Synchronize Client's totalBilled and totalPaid
    const clientUpdates = { $inc: { totalBilled: totalAmount } };
    if (finalStatus === 'paid') {
      clientUpdates.$inc.totalPaid = totalAmount;
    }
    await Client.findByIdAndUpdate(client._id, clientUpdates);

    // 12. Populate and respond
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('clientId', 'name email company currency')
      .populate('projectId', 'title status')
      .populate('userId', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: populatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 4. Update an existing invoice
// ============================================================================
// @desc    Update invoice details
// @route   PUT /api/invoices/:id or PATCH /api/invoices/:id
// @access  Private (admin, agency_owner, freelancer)
const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid invoice ID format: ${id}`,
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Invoice not found with id: ${id}`,
      });
    }

    // Multi-tenancy check
    if (
      req.user.role !== 'admin' &&
      String(invoice.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this invoice.',
      });
    }

    const previousTotal = invoice.totalAmount;
    const previousStatus = invoice.status;

    // Line items update and recalculation if provided
    if (req.body.items !== undefined) {
      if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'An invoice must contain at least one line item',
        });
      }

      const updatedItems = [];
      let updatedSubtotal = 0;

      for (let i = 0; i < req.body.items.length; i++) {
        const item = req.body.items[i];
        if (!item.description || !String(item.description).trim()) {
          return res.status(400).json({
            success: false,
            message: `Line item at index ${i} is missing description`,
          });
        }
        const qty = Number(item.quantity) >= 1 ? Number(item.quantity) : 1;
        const price = Number(item.unitPrice) >= 0 ? Number(item.unitPrice) : 0;
        const amount = Number((qty * price).toFixed(2));
        updatedSubtotal += amount;

        updatedItems.push({
          description: String(item.description).trim(),
          quantity: qty,
          unitPrice: price,
          amount,
        });
      }

      invoice.items = updatedItems;
      invoice.subtotal = Number(updatedSubtotal.toFixed(2));
    }

    // Tax rate & Discount update
    if (req.body.taxRate !== undefined) {
      const parsedTax = Number(req.body.taxRate);
      if (isNaN(parsedTax) || parsedTax < 0) {
        return res.status(400).json({
          success: false,
          message: 'Tax rate must be a non-negative number',
        });
      }
      invoice.taxRate = parsedTax;
    }

    if (req.body.discount !== undefined) {
      const parsedDisc = Number(req.body.discount);
      if (isNaN(parsedDisc) || parsedDisc < 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount must be a non-negative number',
        });
      }
      invoice.discount = parsedDisc;
    }

    // Recompute taxAmount and totalAmount
    invoice.taxAmount = Number(((invoice.subtotal * (invoice.taxRate || 0)) / 100).toFixed(2));
    invoice.totalAmount = Math.max(
      0,
      Number((invoice.subtotal + invoice.taxAmount - (invoice.discount || 0)).toFixed(2))
    );

    // Status update
    if (req.body.status) {
      if (!ALLOWED_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: `'${req.body.status}' is not a valid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
        });
      }
      invoice.status = req.body.status;
      if (invoice.status === 'paid' && !invoice.paidAt) {
        invoice.paidAt = new Date();
      } else if (invoice.status !== 'paid') {
        invoice.paidAt = undefined;
      }
    }

    // Payment method
    if (req.body.paymentMethod !== undefined) {
      if (
        req.body.paymentMethod &&
        !ALLOWED_PAYMENT_METHODS.includes(req.body.paymentMethod)
      ) {
        return res.status(400).json({
          success: false,
          message: `'${req.body.paymentMethod}' is not a valid payment method`,
        });
      }
      invoice.paymentMethod = req.body.paymentMethod || undefined;
    }

    if (req.body.dueDate) {
      invoice.dueDate = new Date(req.body.dueDate);
    }
    if (req.body.notes !== undefined) {
      invoice.notes = String(req.body.notes).trim();
    }
    if (req.body.terms !== undefined) {
      invoice.terms = String(req.body.terms).trim();
    }
    if (req.body.currency) {
      invoice.currency = String(req.body.currency).trim().toUpperCase();
    }

    await invoice.save();

    // Client Financial Balance Reconciliation:
    // 1. Adjust totalBilled if totalAmount changed
    const billedDiff = Number((invoice.totalAmount - previousTotal).toFixed(2));
    let paidDiff = 0;

    // 2. Adjust totalPaid if status transitioned
    if (previousStatus !== 'paid' && invoice.status === 'paid') {
      paidDiff = invoice.totalAmount;
    } else if (previousStatus === 'paid' && invoice.status !== 'paid') {
      paidDiff = -previousTotal;
    } else if (previousStatus === 'paid' && invoice.status === 'paid') {
      paidDiff = billedDiff;
    }

    if (billedDiff !== 0 || paidDiff !== 0) {
      const clientUpdate = { $inc: {} };
      if (billedDiff !== 0) clientUpdate.$inc.totalBilled = billedDiff;
      if (paidDiff !== 0) clientUpdate.$inc.totalPaid = paidDiff;
      await Client.findByIdAndUpdate(invoice.clientId, clientUpdate);
    }

    const updatedPopulated = await Invoice.findById(invoice._id)
      .populate('clientId', 'name email company currency')
      .populate('projectId', 'title status')
      .populate('userId', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedPopulated,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 5. Quick status update (PATCH /api/invoices/:id/status)
// ============================================================================
// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
// @access  Private (admin, agency_owner, freelancer)
const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid invoice ID format: ${id}`,
      });
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `'${status}' is not a valid invoice status. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Invoice not found with id: ${id}`,
      });
    }

    // Multi-tenancy check
    if (
      req.user.role !== 'admin' &&
      String(invoice.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this invoice.',
      });
    }

    const previousStatus = invoice.status;
    invoice.status = status;

    if (paymentMethod) {
      if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: `'${paymentMethod}' is not a valid payment method`,
        });
      }
      invoice.paymentMethod = paymentMethod;
    }

    if (status === 'paid' && !invoice.paidAt) {
      invoice.paidAt = new Date();
    } else if (status !== 'paid') {
      invoice.paidAt = undefined;
    }

    await invoice.save();

    // Adjust client totalPaid balance
    if (previousStatus !== 'paid' && status === 'paid') {
      await Client.findByIdAndUpdate(invoice.clientId, {
        $inc: { totalPaid: invoice.totalAmount },
      });
    } else if (previousStatus === 'paid' && status !== 'paid') {
      await Client.findByIdAndUpdate(invoice.clientId, {
        $inc: { totalPaid: -invoice.totalAmount },
      });
    }

    const updated = await Invoice.findById(invoice._id)
      .populate('clientId', 'name email company currency')
      .populate('projectId', 'title status');

    res.status(200).json({
      success: true,
      message: `Invoice status updated to '${status}'`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 6. Delete invoice
// ============================================================================
// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (admin, agency_owner, freelancer)
const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid invoice ID format: ${id}`,
      });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Invoice not found with id: ${id}`,
      });
    }

    // Multi-tenancy check
    if (
      req.user.role !== 'admin' &&
      String(invoice.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this invoice.',
      });
    }

    // Reconcile client financial balances
    const clientDecrement = { $inc: { totalBilled: -invoice.totalAmount } };
    if (invoice.status === 'paid') {
      clientDecrement.$inc.totalPaid = -invoice.totalAmount;
    }
    await Client.findByIdAndUpdate(invoice.clientId, clientDecrement);

    await Invoice.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Invoice removed successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 7. Get financial statistics & analytics
// ============================================================================
// @desc    Get invoice financial stats
// @route   GET /api/invoices/stats
// @access  Private (admin, agency_owner, freelancer)
const getInvoiceStats = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'admin') {
      if (req.query.userId && isValidObjectId(req.query.userId)) {
        filter.userId = new mongoose.Types.ObjectId(req.query.userId);
      }
    } else {
      filter.userId = new mongoose.Types.ObjectId(req.user._id);
    }

    const now = new Date();

    const [
      totalCount,
      draftCount,
      sentCount,
      paidCount,
      partiallyPaidCount,
      overdueCount,
      cancelledCount,
      financialAgg,
    ] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.countDocuments({ ...filter, status: 'draft' }),
      Invoice.countDocuments({ ...filter, status: 'sent' }),
      Invoice.countDocuments({ ...filter, status: 'paid' }),
      Invoice.countDocuments({ ...filter, status: 'partially_paid' }),
      Invoice.countDocuments({
        ...filter,
        $or: [
          { status: 'overdue' },
          { status: { $in: ['draft', 'sent', 'partially_paid'] }, dueDate: { $lt: now } },
        ],
      }),
      Invoice.countDocuments({ ...filter, status: 'cancelled' }),
      Invoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalBilled: {
              $sum: {
                $cond: [{ $ne: ['$status', 'cancelled'] }, '$totalAmount', 0],
              },
            },
            totalPaid: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0],
              },
            },
            totalOverdueAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$status', 'paid'] },
                      { $ne: ['$status', 'cancelled'] },
                      { $lt: ['$dueDate', now] },
                    ],
                  },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const totalBilled = financialAgg[0]?.totalBilled || 0;
    const totalPaid = financialAgg[0]?.totalPaid || 0;
    const totalOutstanding = Math.max(0, totalBilled - totalPaid);
    const totalOverdueAmount = financialAgg[0]?.totalOverdueAmount || 0;

    res.status(200).json({
      success: true,
      data: {
        totalInvoices: totalCount,
        statusCounts: {
          draft: draftCount,
          sent: sentCount,
          paid: paidCount,
          partiallyPaid: partiallyPaidCount,
          overdue: overdueCount,
          cancelled: cancelledCount,
        },
        financials: {
          totalBilled: Number(totalBilled.toFixed(2)),
          totalPaid: Number(totalPaid.toFixed(2)),
          totalOutstanding: Number(totalOutstanding.toFixed(2)),
          totalOverdueAmount: Number(totalOverdueAmount.toFixed(2)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 8. Get all invoices for a specific client (Relationship endpoint)
// ============================================================================
// @desc    Get all invoices linked to a client
// @route   GET /api/clients/:id/invoices
// @access  Private (admin, agency_owner, freelancer)
const getClientInvoices = async (req, res, next) => {
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

    // Multi-tenancy check
    if (
      req.user.role !== 'admin' &&
      String(client.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access invoices for this client.',
      });
    }

    const filter = { clientId: client._id };
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-issueDate -createdAt';

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter)
        .populate('projectId', 'title status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      client: {
        _id: client._id,
        name: client.name,
        company: client.company,
        currency: client.currency,
        totalBilled: client.totalBilled,
        totalPaid: client.totalPaid,
      },
      count: invoices.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 9. Get all invoices for a specific project (Relationship endpoint)
// ============================================================================
// @desc    Get all invoices linked to a project
// @route   GET /api/projects/:id/invoices
// @access  Private (admin, agency_owner, freelancer)
const getProjectInvoices = async (req, res, next) => {
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

    // Multi-tenancy check
    if (
      req.user.role !== 'admin' &&
      String(project.userId) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access invoices for this project.',
      });
    }

    const filter = { projectId: project._id };
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const sort = req.query.sort || '-issueDate -createdAt';

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter)
        .populate('clientId', 'name email company')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      project: {
        _id: project._id,
        title: project.title,
        status: project.status,
        budget: project.budget,
      },
      count: invoices.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  generateInvoice: createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getInvoiceStats,
  getClientInvoices,
  getProjectInvoices,
};
