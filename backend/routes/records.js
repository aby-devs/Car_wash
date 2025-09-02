const express = require('express');
const router = express.Router();
const { CarWashRecords } = require('../controllers');

// Car wash records routes
router.post('/', CarWashRecords.add_record);
router.get('/', CarWashRecords.get_records);
router.get('/search', CarWashRecords.search_records);
router.get('/dashboard', CarWashRecords.get_dashboard_stats);
router.get('/:id', CarWashRecords.get_record);
router.put('/:id', CarWashRecords.update_record);
router.delete('/:id', CarWashRecords.delete_record);

module.exports = router;
