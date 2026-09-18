const express = require('express');
const router = express.Router();
const { getClients, createClient } = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, authorize('admin', 'agency_owner', 'freelancer'), getClients)
  .post(protect, authorize('admin', 'agency_owner'), createClient);

module.exports = router;
