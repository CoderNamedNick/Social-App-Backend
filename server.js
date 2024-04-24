const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Require bcrypt
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const http = require('http'); // Import http module

// Import the User model
const User = require('./Models/User');

// Import route handlers
const userRouter = require('./routes/Users');
const guildRouter = require('./routes/Guilds');
const messageRouter = require('./routes/Messages')

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/Users', userRouter);
app.use('/Guilds', guildRouter);
app.use('/Messages', messageRouter);

// Database connection
mongoose.connect('mongodb://localhost:27017/Social-App', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');

  // Create HTTP server
  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`HTTP Server is running on port ${PORT}`);
  });

  // WebSocket server
  const wss = new WebSocket.Server({ noServer: true });

  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection');

    // Event listener for incoming messages
    ws.on('message', message => {
      console.log('Received message:', message);
      const { token } = JSON.parse(message);
      console.log('Received token:', token);

      // Authenticate user based on token sent by the client
      authenticateUser(token)
        .then(user => {
          if (!user) {
            console.log('No User');
            // Close connection if authentication fails
            ws.close();
            return;
          }

          // Send user-specific data to the new client
          ws.send(JSON.stringify({ user }));
        })
        .catch(error => {
          console.error('Error authenticating user:', error);
          ws.close();
        });
    });

    ws.on('close', (code, reason) => {
      console.log('WebSocket connection closed:', code, reason);
      // Additional cleanup or logging if needed
    });
  });

  // Upgrade HTTP server to WebSocket server
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request);
    });
  });

})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

async function authenticateUser(token) {
  try {
    if (!token) {
      console.log('no token');
      return null;
    } 
    
    // Verify token and extract user information
    const decoded = jwt.verify(token, 'your_secret_key'); // Replace 'your_secret_key' with your actual secret key
    const { userId } = decoded;

    // Fetch user from the database based on userId
    const foundUser = await User.findById(userId); // Use a different variable name to avoid confusion
    console.log(foundUser);
    return foundUser;
  } catch (error) {
    throw error;
  }
}