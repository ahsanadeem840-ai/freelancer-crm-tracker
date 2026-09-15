const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notificationController');

router.route('/').get(getNotifications);

module.exports = router;
