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

  const usersForConvos = {};
  const usersForMessages = {};
  const usersForInTheMessages = {};

  // Event listener for incoming WebSocket connections
  io.on('connection', (socket) => {
    console.log('New Socket.IO connection');

    socket.on('storeUserIdForConvos', (userId) => {
      usersForConvos[userId] = socket.id;
    });
    socket.on('storeUserIdForMessages', (userId) => {
      usersForMessages[userId] = socket.id;
    });
    socket.on('storeUserIdForInTheMessages', (userId) => {
      console.log('stored id')
      usersForInTheMessages[userId] = socket.id;
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
        console.log('trying message count1')
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
       // Event for message Count
       socket.on('message-count2', async (userId, companionId, cb) => {
        try {
          console.log('trying message count2')
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
        const unreadMessageCount = await getMessageCount(theCompanion._id || theCompanion.id, theUser._id || theUser.id);

        const socketId = usersForConvos[companionId];
        if (socketId) {
          console.log('this is socket id of companion for convos', socketId);
          io.to(socketId).emit('convo-count-update', unreadConversationCount);
        }
        const socketId2 = usersForMessages[companionId];
        if (socketId2) {
          console.log('this is socket id of companion for messages', socketId);
          io.to(socketId2).emit('message-count-update', theUser.id || theUser._id, unreadMessageCount);
        }

      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });

   // Event listener Sent Messaegs
    socket.on('sending-A-New-Message', async (senderId, receiverId, messageContent ) => {
      console.log('trying message')
      try {

        // Authenticate user based on userId
        const theUser = await authenticateUserById(senderId);
        const theCompanion = await authenticateUserById(receiverId);

        // Check if both sender and receiver exist
        if (!theUser || !theCompanion) {
          console.log('User or Companion not authenticated');
          return;
        }

        const Conversation = await SendAndUpdateMessages(senderId, receiverId, messageContent)
        const unreadMessageCount = await getMessageCount(theCompanion._id || theCompanion.id, theUser._id || theUser.id);
        
        //now emit the new conversation back to users
        const socketId = usersForInTheMessages[receiverId];
          if (socketId) {
            console.log('this is socket id of companion', socketId);
            io.to(socketId).emit('New-Message-update', Conversation);
          }
          const socketId2 = usersForInTheMessages[senderId];
          if (socketId2) {
            console.log('this is socket id of user', socketId2);
            io.to(socketId2).emit('New-Message-update', Conversation);
          }
          const socketId3 = usersForMessages[theCompanion._id || theCompanion.id];
          if (socketId3) {
            console.log('this is socket id of companion for messages', socketId);
            io.to(socketId3).emit('message-count-update', theUser.id || theUser._id, unreadMessageCount);
          }

        console.log('Message sent successfully.');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    // Event listener for WebSocket connection closure
    socket.on('disconnect', () => {
      console.log('Socket.IO connection disconnected');
      // Additional cleanup or logging if needed
      const userId = Object.keys(usersForConvos).find(key => usersForConvos[key] === socket.id);
      if (userId) {
        delete usersForConvos[userId];
      }
      const userId2 = Object.keys(usersForMessages).find(key => usersForMessages[key] === socket.id);
      if (userId2) {
        delete usersForMessages[userId2];
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
// Function to fetchmessaegs between users
async function SendAndUpdateMessages(userId, companionId, content) {
  try {
  
    // Check if sender and receiver exist
    const sender = await User.findById(userId);
    const receiver = await User.findById(companionId);

    if (!sender || !receiver) {
      console.log('Sender or Receiver not found')
      return
    }

    // Get the usernames of sender and receiver
    const senderUsername = sender.username;
    const receiverUsername = receiver.username;

    // Check if there's an existing conversation between sender and receiver
    let conversation = await Message.findOne({
      messengers: { $all: [userId, companionId] },
      UserNames: { $all: [senderUsername, receiverUsername] },
    });

    // If no existing conversation, create a new one
    if (!conversation) {
      console.log('no previous Convos')
    }else {
      // Update the usernames if they are not already present
      if (!conversation.UserNames.includes(senderUsername)) {
        conversation.UserNames.push(senderUsername);
      }
      if (!conversation.UserNames.includes(receiverUsername)) {
        conversation.UserNames.push(receiverUsername);
      }

      // Add the new message to the conversation
      conversation.messages.push({
        sender: userId,
        senderUsername: senderUsername,
        receiver: companionId,
        content: content
      });
    }

    // Save the conversation to the database
    await conversation.save();

    return conversation;
  } catch (error) {
    throw error;
  }
}
// Function to Mark Messages as read
async function MarkAsRead(userId, companionId) {
  try {
    // Find the conversation between the user and the companion
    const conversation = await Message.findOne({
      messengers: { $all: [userId, companionId] }
    });

    // If conversation doesn't exist or no messages, return 0
    if (!conversation || conversation.messages.length === 0) {
      return 0;
    }
    
     // Mark each message as read
    conversation.messages.forEach(async message => {
      message.read = true;
      await message.save(); // Save the updated message
    });

    let newNotifCount = 0;

    return newNotifCount;
  } catch (error) {
    throw error;
  }
}