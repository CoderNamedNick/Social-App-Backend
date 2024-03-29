const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Enable CORS
app.use(cors());

// Connect to MongoDB database
mongoose.connect('mongodb://localhost:27017/Social-App', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  // Send a message to the frontend
  app.get('/api/message', (req, res) => {
    res.json({ message: 'Successfully connected to MongoDB' });
  });
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

// Define other routes and APIs
const userRouter = require('./routes/Users')
app.use('/Users', userRouter)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});