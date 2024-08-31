const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'upload-service',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

const produceMessage = async (taskId, filePaths) => {
  await producer.connect();
  await producer.send({
    topic: 'file-upload',
    messages: [
      {
        key: taskId,
        value: JSON.stringify({ taskId, filePaths }),
      },
    ],
  });
  await producer.disconnect();
};

module.exports = {
  produceMessage,
};
