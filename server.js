const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const socketIO = require('socket.io');
const http = require('http');

// Import the User and Message models
const User = require('./Models/User');
const Message = require('./Models/Message');

// Import route handlers
const userRouter = require('./routes/Users');
const guildRouter = require('./routes/Guilds');
const messageRouter = require('./routes/Messages');

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/Users', userRouter);
app.use('/Guilds', guildRouter);
app.use('/Messages', messageRouter);

// Create HTTP server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`HTTP Server is running on port ${PORT}`);
});

// WebSocket server
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
});

// Database connection
mongoose.connect('mongodb://localhost:27017/Social-App', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');

  // Event listener for incoming WebSocket connections
  io.on('connection', (socket) => {
    console.log('New Socket.IO connection');

    // Event for Message Count
    socket.on('message-count', async (userId) => {
      try {
        // Authenticate user based on userId
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }
    
        // Fetch unread message count for the user from the database
        const unreadMessageCount = await getMessageCount(user._id);
    
        // Emit the unread message count to the client
        socket.emit('message-count-response', unreadMessageCount);
      } catch (error) {
        console.error('Error fetching message count:', error);
      }
    });

    // Event listener for incoming messages
    io.on('sending-Message', (message, room) => {
    

    });

    // Event listener for WebSocket connection closure
    socket.on('disconnect', () => {
      console.log('Socket.IO connection disconnected');
      // Additional cleanup or logging if needed
    });
  });

})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

// Function to authenticate user based on id
async function authenticateUserById(userId) {
  try {
    // Fetch user from the database based on userId
    const foundUser = await User.findById(userId);
    return foundUser;
  } catch (error) {
    throw error;
  }
}
// Function to fetch unread message count for a user
async function getMessageCount(userId) {
  try {
    // Your logic to fetch unread message count from the database based on userId
    // For example:
    const unreadMessages = await Message.find({
      messengers: userId,
      'messages.sender': { $ne: userId },
      'messages.read': false
    });
    return unreadMessages.length;
  } catch (error) {
    throw error;
  }
}