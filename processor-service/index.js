const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const PORT = process.env.PORT;
const { Kafka } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');
const { processor } = require('./utils/processor');
const prisma = new PrismaClient();
// const processRoutes = require('./routes/processRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  console.log('hello');
  res.status(200).json({ message: 'Health check success' });
});

const kafka = new Kafka({
  clientId: 'upload-service',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'file-upload-group' });

const start = async () => {
  try {
    await consumer.connect();
    console.log('Consumer connected');
    await consumer.subscribe({ topic: 'file-upload', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const { taskId, paymentFilePath, taxFilePath } = JSON.parse(
            message.value.toString()
          );

          // Process the reports
          const { summary, categoryStats, toleranceStats } = await processor(
            paymentFilePath,
            taxFilePath
          );

          console.log('Summary:', summary);
          console.log('Category Stats:', categoryStats);
          console.log('Tolerance Stats:', toleranceStats);

          const updatedReport = await prisma.report.update({
            where: { id: taskId },
            data: {
              summary: summary,
              category_stats: categoryStats,
              tolerance_stats: toleranceStats,
            },
          });

          console.log('Report updated:', updatedReport);
        } catch (error) {
          console.error('Error processing message:', error);
          // Handle error (e.g., mark task as failed in database)
        }
      },
    });
  } catch (error) {
    console.error('Error starting consumer:', error);
    throw error;
  }
};

const stop = async () => {
  try {
    await consumer.disconnect();
    console.log('Consumer disconnected');
  } catch (error) {
    console.error('Error disconnecting consumer:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT signal received.');
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received.');
  await stop();
  process.exit(0);
});

start().catch(console.error);

// app.use('/api/process', processRoutes);

app.listen(PORT, () => {
  console.log(`processor-service is listening on http://localhost:${PORT}/`);
});
