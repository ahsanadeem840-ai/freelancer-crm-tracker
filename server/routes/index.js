const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const clientRoutes = require('./clientRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
