const fs = require('fs');
const path = require('path');
const { produceMessage } = require('../kafka/kafka');

const uploadFiles = (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length < 2) {
      return res
        .status(400)
        .json({ error: 'Please upload both CSV and XLSX files.' });
    }

    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const filePaths = files.map((file) => {
      const filePath = path.join(uploadDir, file.originalname);
      fs.writeFileSync(filePath, file.buffer);
      return filePath;
    });

    const taskId = generateTaskId();

    sendToKafka(taskId, filePaths);

    res.status(200).json({ taskId });
  } catch (error) {
    console.error('Error in uploadFiles:', error);
    res.status(500).json({ error: 'An error occurred while uploading files.' });
  }
};

const generateTaskId = () => {
  return 'task_' + Date.now();
};

const sendToKafka = (taskId, filePaths) => {
  try {
    produceMessage(taskId, filePaths);
  } catch (error) {
    console.error('Error in sendToKafka:', error);
    throw new Error('Failed to send message to Kafka');
  }
};

module.exports = {
  uploadFiles,
};
