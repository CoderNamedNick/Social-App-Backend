const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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

  const users = {};

  // Event listener for incoming WebSocket connections
  io.on('connection', (socket) => {
    console.log('New Socket.IO connection');

    socket.on('storeUserId', (userId) => {
      users[userId] = socket.id;
    });

    // Event for Converstaion Count
    socket.on('Conversation-count', async (userId, cb) => {
      try {
        // Authenticate user based on userId
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }
    
        // Fetch unread Converstaion count for the user from the database
        const unreadConversationCount = await getConversationCount(user._id || user.id);
    
        // Emit the unread Conversation count to the client
        cb(unreadConversationCount);
        console.log('sent Conversation-count-response');
      } catch (error) {
        console.error('Error fetching Conversation count:', error);
      }
    });

   // Event for message Count
    socket.on('message-count', async (userId, companionId, cb) => {
      try {
        // Authenticate user based on userId
        const theUser = await authenticateUserById(userId);
        const theCompanion = await authenticateUserById(companionId);

        // Check if both sender and receiver exist
        if (!theUser || !theCompanion) {
          console.log('User or Companion not authenticated');
          return;
        }

        // Fetch unread message count for the user from the database
        const unreadMessageCount = await getMessageCount(theUser._id || theUser.id, theCompanion._id || theCompanion.id);

        // Emit the unread message count to the client
        cb(unreadMessageCount);
      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });
    // Event for New Convo Start
    socket.on('new-convo', async (userId, companionId, ) => {
      console.log('trying new convo')
      try {
        // Authenticate user based on userId
        const theUser = await authenticateUserById(userId);
        const theCompanion = await authenticateUserById(companionId);

        // Check if both sender and receiver exist
        if (!theUser || !theCompanion) {
          console.log('User or Companion not authenticated');
          return;
        }

        const unreadConversationCount = await getConversationCount(theCompanion._id || theCompanion.id);

        const socketId = users[companionId];
        if (socketId) {
          console.log('this is socket id of companion', socketId)
          io.to(socketId).emit('convo-count-update', unreadConversationCount);
        }

      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });

    // Event listener for incoming messages
    io.on('sending-A-Message', async (senderId, receiverId, messageContent) => {
      console.log('trying message')
      try {
        console.log('trying message')
        // Authenticate sender and receiver based on their IDs
        const sender = await authenticateUserById(senderId);
        const receiver = await authenticateUserById(receiverId);

        // Check if both sender and receiver exist
        if (!sender || !receiver) {
          console.log('Sender or receiver not authenticated');
          return;
        }

        // Check if there's an existing conversation between sender and receiver
        let conversation = await Message.findOne({
          messengers: { $all: [senderId, receiverId] }
        });

        // If no existing conversation, create a new one
        if (!conversation) {
          conversation = new Message({
            messengers: [senderId, receiverId],
            messages: []
          });
        }

        // Create a new message object
        const newMessage = {
          sender: senderId,
          receiver: receiverId,
          content: messageContent,
          timestamp: new Date(), // You can add a timestamp for the message
          read: false,
        };

        // Add the new message to the conversation
        conversation.messages.push(newMessage);

        // Save the conversation to the database
        await conversation.save();

        // Emit the new message to both sender and receiver
        io.to(senderId).emit('new-message', newMessage);
        io.to(receiverId).emit('new-message', newMessage);
        io.emit('Converstaion-count', senderId)
        io.emit('message-count', senderId, receiverId );

        console.log('Message sent successfully.');
      } catch (error) {
        console.error('Error sending message:', error);
      }
  });

    // Event listener for WebSocket connection closure
    socket.on('disconnect', () => {
      console.log('Socket.IO connection disconnected');
      // Additional cleanup or logging if needed
      const userId = Object.keys(users).find(key => users[key] === socket.id);
      if (userId) {
        delete users[userId];
      }
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
// Function to fetch unread conversation count for a user
async function getConversationCount(userId) {
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
// Function to fetch unread message count between a user and a companion
async function getMessageCount(userId, companionId) {
  try {
    // Find the conversation between the user and the companion
    const conversation = await Message.findOne({
      messengers: { $all: [userId, companionId] }
    });

    // If conversation doesn't exist or no messages, return 0
    if (!conversation || conversation.messages.length === 0) {
      return 0;
    }

    // Count unread messages between the user and the companion
    let unreadCount = 0;
    conversation.messages.forEach(message => {
      if (message.receiver.includes(userId) && message.sender.equals(companionId) && !message.read) {
        unreadCount++;
      }
    });

    return unreadCount;
  } catch (error) {
    throw error;
  }
}