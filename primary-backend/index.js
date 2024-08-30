const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const PORT = process.env.PORT;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  console.log('hello');
  res.status(200).json({ message: 'Health check success' });
});

app.listen(PORT, () => {
  console.log(`upload-service is listening on http://localhost:${PORT}/`);
});
