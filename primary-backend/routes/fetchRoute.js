const express = require('express');
const {
  fetchReports,
  fetchAnalysis,
} = require('../controllers/fetchController');

const router = express.Router();

router.get('/reports', fetchReports);
router.get('/report/:taskId', fetchAnalysis);

module.exports = router;
