const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'upload-service',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

const start = async () => {
  try {
    await producer.connect();
    console.log('Producer connected');
  } catch (error) {
    console.error('Error connecting producer:', error);
    throw error;
  }
};

const stop = async () => {
  try {
    await producer.disconnect();
    console.log('Producer disconnected');
  } catch (error) {
    console.error('Error disconnecting producer:', error);
    throw error;
  }
};

const produceMessage = async (message) => {
  try {
    await producer.send({
      topic: 'file-upload',
      messages: [
        {
          key: message.taskId, // Optional
          value: JSON.stringify(message),
        },
      ],
    });
    console.log('Message produced successfully:', message);
  } catch (error) {
    console.error('Error producing message:', error);
    throw error;
  }
};

module.exports = {
  produceMessage,
  start,
  stop,
};
