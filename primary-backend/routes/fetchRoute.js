const express = require('express');
const { fetchReports } = require('../controllers/fetchController');

const router = express.Router();

router.get('/reports', fetchReports);

module.exports = router;
