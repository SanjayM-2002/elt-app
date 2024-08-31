const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFiles } = require('../controllers/uploadController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const fileName = `${file.fieldname}_${timestamp}${path.extname(
      file.originalname
    )}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

const router = express.Router();

router.post(
  '/upload',
  upload.fields([
    { name: 'paymentReport', maxCount: 1 },
    { name: 'taxReport', maxCount: 1 },
  ]),
  uploadFiles
);

module.exports = router;
