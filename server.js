const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const EventEmitter = require('events');
const messageEmitter = require('./Emitters/messageEmitter');
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
const wss = new WebSocket.Server({ server });

// Database connection
mongoose.connect('mongodb://localhost:27017/Social-App', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');

  // Event listener for incoming WebSocket connections
  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection');

    // Event listener for incoming messages
    ws.on('message', async message => {
      console.log('Received message:', message);
      const { type, token } = JSON.parse(message);
      console.log('Received token:', token);

      // Authenticate user based on token sent by the client
      if (type === 'message') {
        try {
          const user = await authenticateUserAndSendMessage(ws, token);
          if (!user) {
            console.log('No User');
            // Close connection if authentication fails
            ws.close();
            return;
          }
        } catch (error) {
          console.error('Error authenticating user:', error);
          ws.close();
        }
      } else if (type === 'messageCount') {
        try {
          const user = await authenticateUser(token);
          if (!user) {
            console.log('No User');
            // Close connection if authentication fails
            ws.close();
            return;
          }

          // Fetch message count for the user from the database and send it to the client
          await getMessageCountAndSendMessage(ws, user._id);
        } catch (error) {
          console.error('Error fetching message count:', error);
          ws.close();
        }
      } else if (type === 'userDataAndMessages') {
        try {
          // Authenticate user based on token
          const user = await authenticateUser(token);
          if (!user) {
            // If user not found, send an error message
            ws.send(JSON.stringify({ error: 'User not authenticated' }));
            return;
          }

          // Fetch user data
          const userData = { username: user.username, email: user.email }; // Example user data
          
          // Fetch messages for the user
          const messages = await Message.find({ messengers: user._id });

          // Send user data and messages back to the client
          ws.send(JSON.stringify({ userData, messages }));
        } catch (error) {
          console.error('Error fetching user data and messages:', error);
          // Send an error message back to the client
          ws.send(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    });

    // Event listener for WebSocket connection closure
    ws.on('close', (code, reason) => {
      console.log('WebSocket connection closed:', code, reason);
      // Additional cleanup or logging if needed
    });

    // Associate user ID with WebSocket connection
    const userId = getUserIdFromToken(request.token); // Implement this function to extract user ID from token
    ws.userId = userId;

    // Update message count for the user associated with the WebSocket connection
    updateMessageCountForUser(userId);
  });

  // Event listener for 'newMessage' event
  messageEmitter.on('newMessage', async (userId) => {
    try {
      // Fetch the latest unread message count for the user from the database
      const newUnreadMessageCount = await Message.countDocuments({
        messengers: userId,
        'messages.read': false
      });

      // Send updated unread message count to the client associated with the user
      wss.clients.forEach(client => {
        if (client.userId === userId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ unreadMessageCount: newUnreadMessageCount }));
        }
      });
    } catch (error) {
      console.error('Error handling new message:', error);
    }
  });
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

// Function to authenticate user based on token
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

// Function to authenticate user and send user-specific data to the client
async function authenticateUserAndSendMessage(ws, token) {
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

    // Send user-specific data to the client
    ws.send(JSON.stringify({ user: foundUser }));

    // Fetch the message content from the database and send it to the client
    const messageContent = await getMessageContent(userId); // Replace this with your logic to fetch message content
    ws.send(JSON.stringify({ messageContent }));
    
    return foundUser;
  } catch (error) {
    throw error;
  }
}

// Function to fetch message content for a user
async function getMessageContent(userId) {
  try {
    // Fetch messages from the database where the sender or receiver is the specified user
    const messages = await Message.find({
      $or: [
        { 'messages.sender': userId },
        { 'messages.receiver': userId }
      ]
    });
    // Return the messages
    return messages;
  } catch (error) {
    throw error;
  }
}

// Function to fetch message count for a user and send it to the client
async function getMessageCountAndSendMessage(ws, userId) {
  try {
    // Your logic to fetch message count from the database based on userId
    // For example:
    const messageCount = await Message.aggregate([
      {
        $match: {
          $and: [
            { messengers: userId }, // User ID is included in messengers array
            { 'messages.read': false } // Messages are unread
          ]
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 } // Count the number of documents that match the criteria
        }
      }
    ]);

    let count = 0;
    if (messageCount.length > 0) {
      count = messageCount[0].count; // Return the message count
    }

    // Send message count to the client
    ws.send(JSON.stringify({ messageCount: count }));
  } catch (error) {
    throw error;
  }
}



// Function to update message count for a user
async function updateMessageCountForUser(userId) {
  try {
    // Your logic to update message count for the user in the database
    // For example:
    const newUnreadMessageCount = await Message.countDocuments({
      messengers: userId,
      'messages.read': false
    });

    // Send updated unread message count to the client associated with the user
    wss.clients.forEach(client => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ unreadMessageCount: newUnreadMessageCount }));
      }
    });
  } catch (error) {
    throw error;
  }
}

// Function to extract user ID from token
function getUserIdFromToken(token) {
  try {
    const decoded = jwt.verify(token, 'your_secret_key'); // Replace 'your_secret_key' with your actual secret key
    return decoded.userId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}