const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Require bcrypt
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const http = require('http'); // Import http module

// Import the User model
const User = require('./Models/User');
const Message = require('./Models/Message');

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