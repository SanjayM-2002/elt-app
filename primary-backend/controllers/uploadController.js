const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { produceMessage } = require('../kafka/kafka');

const uploadFiles = async (req, res) => {
  console.log('check');
  try {
    const files = req.files;
    console.log('files: ', files);
    if (!files || !files.paymentReport || !files.taxReport) {
      return res
        .status(400)
        .json({ error: 'Both payment and tax files must be uploaded.' });
    }

    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const paymentFile = files.paymentReport[0];
    const taxFile = files.taxReport[0];

    if (!paymentFile || !taxFile) {
      return res
        .status(400)
        .json({ error: 'Both payment and tax files must be present.' });
    }

    const originalPaymentFilePath = paymentFile.path;
    const originalTaxFilePath = taxFile.path;

    // Define final file paths
    const finalPaymentFilePath = path.join(
      uploadDir,
      `payment_${req.body.email}_${Date.now()}.csv`
    );
    const finalTaxFilePath = path.join(
      uploadDir,
      `tax_${req.body.email}_${Date.now()}.xlsx`
    );

    // Rename files to final file paths
    fs.renameSync(originalPaymentFilePath, finalPaymentFilePath);
    fs.renameSync(originalTaxFilePath, finalTaxFilePath);

    console.log('Files renamed successfully.');
    console.log('here----------');
    console.log('email is: ', req.body.email);

    const report = await prisma.report.create({
      data: {
        email: req.body.email,
        summary: {},
        category_stats: {},
        tolerance_stats: {},
      },
    });

    const taskId = report.id;

    // Send details to Kafka
    sendToKafka(taskId, finalPaymentFilePath, finalTaxFilePath);

    res.status(200).json({ report });
  } catch (error) {
    console.error('Error in uploadFiles:', error);
    res.status(500).json({ error: 'An error occurred while uploading files.' });
  }
};

const sendToKafka = (taskId, paymentFilePath, taxFilePath) => {
  try {
    produceMessage({
      taskId,
      paymentFilePath,
      taxFilePath,
    });
  } catch (error) {
    console.error('Error in sendToKafka:', error);
    throw new Error('Failed to send message to Kafka');
  }
};

module.exports = {
  uploadFiles,
};
