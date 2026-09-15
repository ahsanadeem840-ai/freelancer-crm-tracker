const express = require('express');
const router = express.Router();
const { getInvoices } = require('../controllers/invoiceController');

router.route('/').get(getInvoices);

module.exports = router;
