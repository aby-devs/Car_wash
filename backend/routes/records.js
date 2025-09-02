const express = require('express');
const router = express.Router();
const { CarWashRecords } = require('../controllers');

// Car wash records routes
router.post('/records', CarWashRecords.add_record);
router.get('/records', CarWashRecords.get_records);
router.get('/records/search', CarWashRecords.search_records);
router.get('/records/dashboard', CarWashRecords.get_dashboard_stats);
router.get('/records/:id', CarWashRecords.get_record);
router.put('/records/:id', CarWashRecords.update_record);
router.delete('/records/:id', CarWashRecords.delete_record);

module.exports = router;
