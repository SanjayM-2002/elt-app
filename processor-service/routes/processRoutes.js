const express = require('express');
const {
  uploadFiles,
  processReports,
  processReports2,
} = require('../controllers/processController');
const router = express.Router();

router.post('/upload1', uploadFiles, processReports2);

module.exports = router;
