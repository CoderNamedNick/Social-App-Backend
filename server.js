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

  // Event listener for incoming WebSocket connections
  io.on('connection', (socket) => {
    console.log('New Socket.IO connection');

    // Event for Converstaion Count
    socket.on('Converstaion-count', async (userId) => {
      try {
        // Authenticate user based on userId
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }
    
        // Fetch unread Converstaion count for the user from the database
        const unreadConverstaionCount = await getConverstaionCount(user._id);
    
        // Emit the unread Converstaion count to the client
        socket.to(userId).emit('Converstaion-count-response', unreadConverstaionCount);
      } catch (error) {
        console.error('Error fetching Converstaion count:', error);
      }
    });

    // Event for message Count
    socket.on('message-count', async (userId, companionid) => {
      try {
          // Authenticate user based on userId
          console.log('Userid', userId)
          console.log('Companionid', companionid)
         // Authenticate sender and receiver based on their IDs
         const theUser = await authenticateUserById(userId);
         const theComapnion = await authenticateUserById(companionid);
 
         // Check if both sender and receiver exist
         if (!theUser || !theComapnion) {
            console.log('User or Companion not authenticated');
            return;
         }
    
        // Fetch unread Converstaion count for the user from the database
        const unreadmessageCount = await getMessageCount(theUser._id || theUser.id, theComapnion.id || theComapnion._id);
    
        // Emit the unread messagae count to the client
        socket.to(userId).emit('message-count-response', {theComapnion , unreadmessageCount });
      } catch (error) {
        console.error('Error fetching Converstaion count:', error);
      }
    });

    // Event listener for incoming messages
    io.on('sending-A-Message', async (senderId, receiverId, messageContent) => {
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
async function getConverstaionCount(userId) {
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