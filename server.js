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
const Guild = require('./Models/Guild');

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
    socket.on('joinGuildRoom', (guildId) => {
      console.log('joined room', guildId);
      // Store the guildId as part of the socket's data
      socket.guildRoom = guildId;
      socket.join(guildId); // Join the room associated with the guild
    });

    //MESSAGES AND CONVOS SOCKETS

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
    // Event for all Unread Messages Count
    socket.on('All-Unread-count', async (userId, cb) => {
      try {
        // Authenticate user based on userId
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }
    
        // Fetch unread Converstaion count for the user from the database
        const allunreadmessagesCount = await getAllUnreadMessagesCount(user._id || user.id);
        // Emit the unread Conversation count to the client
        cb(allunreadmessagesCount);
        console.log('sent All Unread response');
      } catch (error) {
        console.error('Error fetching Conversation count:', error);
      }
    });
   // Event for message Count
    socket.on('message-count', async (userId, companionId, cb) => {
      try {
        const theUser = await authenticateUserById(userId);
        const theCompanion = await authenticateUserById(companionId);

        if (!theUser || !theCompanion) {
          console.log('User or Companion not authenticated');
          return;
        }

        const unreadMessageCount = await getMessageCount(theUser._id || theUser.id, theCompanion._id || theCompanion.id);

        cb(unreadMessageCount);
      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });
       // Event for message Count
    socket.on('message-count2', async (userId, companionId, cb) => {
      try {
        const theUser = await authenticateUserById(userId);
        const theCompanion = await authenticateUserById(companionId);

        if (!theUser || !theCompanion) {
          console.log('User or Companion not authenticated');
          return;
        }

        const unreadMessageCount = await getMessageCount(theUser._id || theUser.id, theCompanion._id || theCompanion.id);
        
        const socketId4 = usersForConvos[theCompanion._id || theCompanion.id];
        if (socketId4) {
          console.log('this is socket id 4', socketId4);
          io.to(socketId4).emit('allunreadupdate', unreadMessageCount);
        }

        cb(unreadMessageCount);
      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });
    // Event for New Convo Start
    socket.on('new-convo', async (userId, companionId, ) => {
      console.log('trying new convo')
      try {
        const theUser = await authenticateUserById(userId);
        const theCompanion = await authenticateUserById(companionId);

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
          io.to(socketId).emit('allunreadupdate', NewUnreadNotifNumber);
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
      try {
        const theUser = await authenticateUserById(senderId);
        const theCompanion = await authenticateUserById(receiverId);

        if (!theUser || !theCompanion) {
          console.log('User or Companion not authenticated');
          return;
        }

        const Conversation = await SendAndUpdateMessages(senderId, receiverId, messageContent)
        const unreadMessageCount = await getMessageCount(theCompanion._id || theCompanion.id, theUser._id || theUser.id);
        
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
          const socketId4 = usersForConvos[theCompanion._id || theCompanion.id];
          if (socketId4) {
            console.log('this is socket id 4', socketId4);
            io.to(socketId4).emit('allunreadupdate', unreadMessageCount);
          }

        console.log('Message sent successfully.');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });
    // Event for message Count
    socket.on('Mark-As-Read', async (userId, companionId ) => {
      try {
        const theUser = await authenticateUserById(userId);
        const theCompanion = await authenticateUserById(companionId);

        if (!theUser || !theCompanion) {
          console.log('User or Companion not authenticated');
          return;
        }

        const NewUnreadNotifNumber = await MarkAsRead(theUser._id || theUser.id, theUser.username ,theCompanion._id || theCompanion.id);

        const socketId = usersForConvos[theUser._id || theUser.id];
          if (socketId) {
            console.log('this is socket id of user', socketId);
            io.to(socketId).emit('allunreadupdate', NewUnreadNotifNumber);
          }
        const socketId2 = usersForInTheMessages[theUser._id || theUser.id];
          if (socketId2) {
            console.log('this is socket id of user', socketId2);
            io.to(socketId2).emit('Read-update', NewUnreadNotifNumber);
          }
      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });

    //GUILD SOCKETS

    // Event for sending whole guild
    socket.on('update-all-guild', async (GuildId) => {
      try {
        const guild = await authenticateGuildById(GuildId);

        if (!guild) {
          console.log('guild not authenticated');
          return;
        }

        io.emit('guild-update', guild)
      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });

    socket.on('update-to-elder', async (GuildId, TravelerId ) => {
      // check if this works pls
      try {
        console.log('trying update to elder')
        // Authenticate the guild and traveler
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }
    
        // Promote the traveler to an elder
        await promoteToElder(guild, traveler);

        // Fetch the updated guild data
        const updatedGuild = await Guild.findById(GuildId);
    
        // Fetch the updated guild members and elders
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });
    //demotes elder to member
    socket.on('demote-to-member', async (GuildId, TravelerId ) => {
      // check if this works pls
      try {
        console.log('trying update to elder')
        // Authenticate the guild and traveler
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }
    
        // Promote the traveler to an elder
        await demoteToMember(guild, traveler);
        
        // Fetch the updated guild data
        const updatedGuild = await Guild.findById(GuildId);

        // Fetch the updated guild members and elders
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);
    
        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });
    //new member joined
    socket.on('New-member', async (GuildId, TravelerId ) => {
      try {
        console.log('trying new member')
        // Authenticate the guild and traveler
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        // Check if the room with the given ID exists
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const updatedGuild = await Guild.findById(GuildId);

        // Fetch the updated guild members and elders
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);
    
        // Emit to everyone in the room that a user has joined
        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });
    //ban member
    socket.on('Ban-member', async (GuildId, TravelerId, Reason ) => {
      try {
        console.log('trying to ban  member')
        // Authenticate the guild and traveler
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        // Check if the room with the given ID exists
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const NewUserInfo = await BanFromGuild(guild, traveler, Reason)

        const updatedGuild = await Guild.findById(GuildId);

        // Fetch the updated guild members and elders
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);
    
        // Emit to everyone in the room that a user has joined
        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
        const socketId = usersForConvos[traveler.id || traveler._id];
        if (socketId) {
          io.to(socketId).emit('Banned-From-A-Guild', NewUserInfo);
        }
      } catch (error) {
        console.error('Error updating to elder:', error);
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
      if (socket.guildRoom) {
        console.log('left room', socket.guildRoom);
        // Leave the room associated with the guild
        socket.leave(socket.guildRoom);
        // Optionally, you can remove the guildRoom property from the socket
        delete socket.guildRoom;
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
    const foundUser = await User.findById(userId);
    return foundUser;
  } catch (error) {
    throw error;
  }
}
// Function to authenticate guild based on id
async function authenticateGuildById(GuildId) {
  try {
    const foundguild = await Guild.findById(GuildId);
    return foundguild;
  } catch (error) {
    throw error;
  }
}
// Function to fetch unread conversation count for a user
async function getConversationCount(userId) {
  try {
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
    const conversation = await Message.findOne({
      messengers: { $all: [userId, companionId] }
    });

    if (!conversation || conversation.messages.length === 0) {
      return 0;
    }

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
// Function to fetch unread message count between a user and a companion
async function getAllUnreadMessagesCount(userId) {
  try {
    const conversations = await Message.find({
      messengers: userId, // User is a messenger
    });

    if (!conversations || conversations.length === 0) {
      console.log('no convos meet this criteria')
      return 0;
    }

    let unreadCount = 0;
    conversations.forEach(conversation => {
      // Iterate through messages in each conversation
      conversation.messages.forEach(message => {
        // Check if the user is the receiver, message is unread, and user is not the sender
        if (message.receiver.includes(userId) && !message.read && !message.sender.equals(userId)) {
          unreadCount++;
        }
      });
    });

    return unreadCount;
  } catch (error) {
    throw error;
  }
}
// Function to fetchmessaegs between users
async function SendAndUpdateMessages(userId, companionId, content) {
  try {
    const sender = await User.findById(userId);
    const receiver = await User.findById(companionId);

    if (!sender || !receiver) {
      console.log('Sender or Receiver not found')
      return
    }

    const senderUsername = sender.username;
    const receiverUsername = receiver.username;

    let conversation = await Message.findOne({
      messengers: { $all: [userId, companionId] },
      UserNames: { $all: [senderUsername, receiverUsername] },
    });

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

    await conversation.save();

    return conversation;
  } catch (error) {
    throw error;
  }
}
// Function to Mark Messages as read
async function MarkAsRead(userId, userName,companionId) {
  try {
    const conversation = await Message.findOne({
      messengers: { $all: [userId, companionId] }
    });

    if (!conversation || conversation.messages.length === 0) {
      return 0;
    }

    // Mark each message as read where the sender is not the current user
    let newNotifCount = 0;
    for (const message of conversation.messages) {
      if (message.sender !== userId && !message.read && message.senderUsername !== userName) {
        message.read = true;
        await message.save({ suppressWarning: true }); // Suppress Mongoose warning
      }
    }

    // Save the updated conversation
    await conversation.save({ suppressWarning: true }); // Suppress Mongoose warning

    return newNotifCount;
  } catch (error) {
    throw error;
  }
}
async function promoteToElder(guild, traveler) {
  try {
    // Find the index of the traveler in the joinedTravelers array
    console.log(traveler.id)
    const travelerIndex = guild.joinedTravelers.findIndex(member => member.id.toString() === traveler.id.toString() || member._id.toString() === traveler.id.toString());

    // If the traveler is found in the joinedTravelers array, remove them
    if (travelerIndex !== -1) {
      guild.joinedTravelers.splice(travelerIndex, 1); // Remove the traveler
    } else {
      throw new Error('Traveler not found in joined members.');
    }

    // Add traveler to guildElders array
    guild.guildElders.push(traveler);

    // Save the updated guild data to the database
    await guild.save();

    console.log(`Promoted traveler ${traveler.id} to elder successfully.`);
  } catch (error) {
    console.error('Error promoting traveler to elder:', error);
    throw error; // rethrow the error to propagate it up
  }
}
async function demoteToMember(guild, elder) {
  try {
    // Find the index of the elder in the guildElders array
    const elderIndex = guild.guildElders.findIndex(member => member.id.toString() === elder.id.toString() || member._id.toString() === elder.id.toString());

    // If the elder is found in the guildElders array, remove them
    if (elderIndex !== -1) {
      guild.guildElders.splice(elderIndex, 1); // Remove the elder
    } else {
      throw new Error('Elder not found in guild elders.');
    }

    // Add elder to joinedTravelers array
    guild.joinedTravelers.push(elder);

    // Save the updated guild data to the database
    await guild.save();

    console.log(`Demoted elder ${elder.id} to member successfully.`);
  } catch (error) {
    console.error('Error demoting elder to member:', error);
    throw error; // rethrow the error to propagate it up
  }
}
async function getGuildMembersAndElders(updatedGuild) {
  const fetchUserDetails = async (userId) => {
    const user = await User.findById(userId);
    return {
      id: user.id || user._id,
      UserName: user.username,
      AccPrivate: user.AccPrivate
    };
  };

  const Members = await Promise.all(updatedGuild.joinedTravelers.map(fetchUserDetails));
  const Elders = await Promise.all(updatedGuild.guildElders.map(fetchUserDetails));
  const Owner = await fetchUserDetails(updatedGuild.guildOwner);

  const guildMembersWithElders = {
    Members,
    Elders,
    Owner
  };

  return guildMembersWithElders;
}
async function BanFromGuild(guild, traveler, Reason) {
  try {
    const elderIndex = guild.guildElders.findIndex(member => 
      member.id.toString() === traveler.id.toString() || member._id.toString() === traveler.id.toString()
    );
    const travelerIndex = guild.joinedTravelers.findIndex(member => 
      member.id.toString() === traveler.id.toString() || member._id.toString() === traveler.id.toString()
    );

    if (elderIndex !== -1) {
      guild.guildElders.splice(elderIndex, 1);
      console.log(`Demoted elder ${traveler.id} to member successfully.`);
    } else if (travelerIndex !== -1) {
      guild.joinedTravelers.splice(travelerIndex, 1);
      console.log(`Banned traveler ${traveler.id} successfully.`);
    } else {
      throw new Error('Traveler not found in joined members or elder.');
    }

    traveler.guildsJoined = traveler.guildsJoined.filter(guildId => {
      const shouldKeep = guildId.toString() !== guild.id.toString();
      if (!shouldKeep) {
        console.log(`Removing guild ${guild.id} from traveler's guildsJoined array`);
      }
      return shouldKeep;
    });

    guild.bannedTravelers.push({ Traveler: traveler._id, Reason: Reason });
    await guild.save();
    const updatedTraveler = await traveler.save();

    return updatedTraveler;
  } catch (error) {
    console.error('Error banning traveler from guild:', error);
    throw error;
  }
}