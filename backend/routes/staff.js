const express = require('express');
const router = express.Router();
const { Staff } = require('../controllers');

// Staff commission routes
router.get('/staff/commission', Staff.get_staff_commission);
router.get('/staff/summary', Staff.get_staff_summary);

module.exports = router;
