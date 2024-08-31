const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const PORT = process.env.PORT;
const uploadRoutes = require('./routes/uploadRoute');
const fetchRoutes = require('./routes/fetchRoute');
const { start } = require('./kafka/kafka');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  console.log('hello');
  res.status(200).json({ message: 'Health check success' });
});

app.use('/api/upload-service', uploadRoutes);
app.use('/api/fetch-service', fetchRoutes);

const initializeServer = async () => {
  try {
    await start();
    app.listen(PORT, () => {
      console.log(`upload-service is listening on http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1); // Exit the process if Kafka connection fails
  }
};

initializeServer();
