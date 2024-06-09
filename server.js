const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const http = require('http');

// Import the User and Message models
const User = require('./Models/User');
const Guild = require('./Models/Guild');
const Message = require('./Models/Message');
const Report = require('./Models/Report')

// Import route handlers
const userRouter = require('./routes/Users');
const guildRouter = require('./routes/Guilds');
const reportRouter = require('./routes/Reports')
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
app.use('/Reports', reportRouter)

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

        io.to(GuildId).emit('guild-update', guild)
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
        io.to(GuildId).emit('guild-update', updatedGuild);
        const socketId = usersForConvos[traveler.id || traveler._id];
        if (socketId) {
          io.to(socketId).emit('Banned-From-A-Guild', NewUserInfo);
        }
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });
    //Unban Member
    socket.on('Unban-member', async (GuildId, TravelerId) => {
      try {
        console.log('trying to unban  member')
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

        await unbanMember(GuildId, TravelerId)

        const updatedGuild = await Guild.findById(GuildId);
    
        // Emit the updated guild data to the room
        io.to(GuildId).emit('guild-update', updatedGuild);

      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });
    //Report member
    socket.on('Report-member', async (GuildId, TravelerId, Reason) => {
      try {
        console.log('trying to report member');
        
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

        await Guild.findByIdAndUpdate(GuildId, {
          $push: {
            Reports: {
              TravelerId: traveler.id || traveler._id,
              TravelerUserName: traveler.username,
              ReasonForReport: Reason
            }
          }
        });

        const updatedGuild = await Guild.findById(GuildId);
    
        // Emit the updated guild data to the room
        io.to(GuildId).emit('guild-update', updatedGuild);
    
      } catch (error) {
        console.error('Error reporting member:', error);
      }
    });
    //Remove Report
    socket.on('Remove-Report', async (GuildId, ReportId) => {
      try {
        console.log('trying to remove report');
        
        // Authenticate the guild
        const guild = await authenticateGuildById(GuildId);
        
        if (!guild) {
          console.log('Guild not authenticated');
          return;
        }
        
        // Check if the room with the given ID exists
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }
        
        // Remove the report with the specified ReportId from the Reports array
        await Guild.findByIdAndUpdate(GuildId, {
          $pull: {
            Reports: {
              $or: [
                { _id: ReportId },
                { id: ReportId }
              ]
            }
          }
        });
    
        const updatedGuild = await Guild.findById(GuildId);
      
        // Emit the updated guild data to the room
        io.to(GuildId).emit('guild-update', updatedGuild);
      
      } catch (error) {
        console.error('Error removing report:', error);
      }
    });
    //Warn member
    socket.on('Warn-member', async (GuildId, TravelerId, Reason) => {
      try {
        console.log('trying to Warn member');
        
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

        await Guild.findByIdAndUpdate(GuildId, {
          $push: {
            Warnings: {
              TravelerId: traveler.id || traveler._id,
              TravelerUserName: traveler.username,
              ReasonForWarning: Reason
            }
          }
        });

        const updatedGuild = await Guild.findById(GuildId);
    
        // Emit the updated guild data to the room
        io.to(GuildId).emit('guild-update', updatedGuild);
    
      } catch (error) {
        console.error('Error warning member:', error);
      }
    });
    //new member requested
    socket.on('request-join-guild', async (GuildId) => {
      try {
        const guild = await authenticateGuildById(GuildId);
    
        if (!guild) {
          console.log('Guild not authenticated');
          return;
        }

        // Check if the room with the given ID exists
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const ReqToJoinTavelers = [];

        // Fetch guild members
        for (const traveler of guild.guildJoinRequest) {
          try {
            const traveler1 = await User.findById(traveler);
            ReqToJoinTavelers.push({
              id: traveler1.id || traveler1._id,
              UserName: traveler1.username,
              AccPrivate: traveler1.AccPrivate
            });
          } catch (err) {
            console.error('Error fetching  travelers:', err.message);
          }
        }

        const updatedGuild = await Guild.findById(GuildId);

        const joinRequestCount = updatedGuild.guildJoinRequest.length
    
        // Emit to everyone in the room that a user has joined
        io.to(GuildId).emit('guildReqUpdates', updatedGuild, joinRequestCount, ReqToJoinTavelers);
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });
    // New member request Accepted
    socket.on('New-member-Accepted', async (GuildId, TravelerId) => {
      try {
        console.log('Trying new member');

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

        // Accept the traveler into the guild
        const updatedValues = await AcceptedToGuild(guild, traveler);

        // Fetch travelers requesting to join
        const ReqToJoinTravelers1 = await Promise.all(
          guild.guildJoinRequest.map(async (travelerId) => {
            try {
              const traveler = await User.findById(travelerId);
              return {
                id: traveler.id || traveler._id,
                UserName: traveler.username,
                AccPrivate: traveler.AccPrivate
              };
            } catch (err) {
              console.error('Error fetching traveler:', err.message);
              return null;
            }
          })
        );

        // Filter out any null values if there were errors fetching travelers
        const ReqToJoinTavelers = ReqToJoinTravelers1.filter(trav => trav !== null);

        // Fetch the updated guild information
        const updatedGuild = await Guild.findById(GuildId);

        const joinRequestCount = updatedGuild.guildJoinRequest.length;
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

        const NewUserData = await User.findById(TravelerId);

        // Emit updates to everyone in the room
        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
        io.to(GuildId).emit('guildReqUpdates', updatedGuild, joinRequestCount, ReqToJoinTavelers);
        const socketId = usersForConvos[TravelerId];
        if (socketId) {
          io.to(socketId).emit('Updated-User-Data', NewUserData);
        }
      } catch (error) {
        console.error('Error accepting new member:', error);
      }
    });
    // New member request Declined
    socket.on('New-member-Declined', async (GuildId, TravelerId) => {
      try {
        console.log('Trying new member');

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

        // Accept the traveler into the guild
        const updatedValues = await DeclinedToGuild(guild, traveler);

        // Fetch travelers requesting to join
        const ReqToJoinTravelers1 = await Promise.all(
          guild.guildJoinRequest.map(async (travelerId) => {
            try {
              const traveler = await User.findById(travelerId);
              return {
                id: traveler.id || traveler._id,
                UserName: traveler.username,
                AccPrivate: traveler.AccPrivate
              };
            } catch (err) {
              console.error('Error fetching traveler:', err.message);
              return null;
            }
          })
        );

        // Filter out any null values if there were errors fetching travelers
        const ReqToJoinTavelers = ReqToJoinTravelers1.filter(trav => trav !== null);

        // Fetch the updated guild information
        const updatedGuild = await Guild.findById(GuildId);

        const joinRequestCount = updatedGuild.guildJoinRequest.length;
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

        // Emit updates to everyone in the room
        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
        io.to(GuildId).emit('guildReqUpdates', updatedGuild, joinRequestCount, ReqToJoinTavelers);

      } catch (error) {
        console.error('Error accepting new member:', error);
      }
    });

    // guidelines update
    socket.on('Guidelines-updated', async (GuildId, NewGuidelines) => {
      try {
        console.log('Trying guidelines');

        // Authenticate the guild and traveler
        const guild = await authenticateGuildById(GuildId);

        if (!guild) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        // Check if the room with the given ID exists
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

       await UpdateGuidelines(guild, NewGuidelines);

        // Fetch the updated guild information
        const updatedGuild = await Guild.findById(GuildId);

        // Emit updates to everyone in the room
        io.to(GuildId).emit('Guild-Settings-updates', updatedGuild);

      } catch (error) {
        console.error('Error updating guidelines:', error);
      }
    });
    // Leaving Guild
    socket.on('Retire-From-Guild', async (GuildId, TravelerId) => {
      try {
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

        await LeavingGuild(guild, traveler);

        // Fetch the updated guild information
        const updatedGuild = await Guild.findById(GuildId);
        const NewUserInfo = await User.findById(traveler.id || traveler._id)
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

        // Emit updates to everyone in the room
        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
        io.to(GuildId).emit('guild-update', updatedGuild);
        const socketId = usersForConvos[traveler.id || traveler._id];
        if (socketId) {
          io.to(socketId).emit('Banned-From-A-Guild', NewUserInfo);
        }
      } catch (error) {
        console.error('Error accepting new member:', error);
      }
    });
    // Disband-Guild handler
    socket.on('Disband-Guild', async (GuildId, TravelerId) => {
      try {
        // Authenticate the guild and traveler
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);

        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }
        
        // Remove guild from each traveler's guildsJoined array
        for (const joinedTravelerId of guild.joinedTravelers) {
          await User.findByIdAndUpdate(
            joinedTravelerId,
            {
              $pull: {
                guildsJoined: GuildId
              }
            }
          );
          const NewUserInfo = await User.findById(joinedTravelerId)
          const socketId = usersForConvos[joinedTravelerId];
          if (socketId) {
            io.to(socketId).emit('Banned-From-A-Guild', NewUserInfo);
          }
        }
        // Remove guild from each traveler's guildsJoined array
        for (const elderId of guild.guildElders) {
          await User.findByIdAndUpdate(
            elderId,
            {
              $pull: {
                guildsJoined: GuildId
              }
            }
          );
          const NewUserInfo = await User.findById(elderId)
          const socketId = usersForConvos[elderId];
          if (socketId) {
            io.to(socketId).emit('Banned-From-A-Guild', NewUserInfo);
          }
        }

        // Check if the traveler is the owner of the guild
        if (!traveler.guildsOwned.includes(GuildId)) {
          console.log('Traveler does not own this guild');
          return;
        }

        // Remove guild id from traveler.guildsOwned and guildsJoined arrays, then save the traveler
        await User.findByIdAndUpdate(
          TravelerId,
          {
            $pull: {
              guildsOwned: GuildId,
              guildsJoined: GuildId
            }
          }
        );

        // Delete the guild
        await Guild.findByIdAndDelete(GuildId);

        const NewOwnerInfo = await User.findById(TravelerId)
        const socketId = usersForConvos[TravelerId];
        if (socketId) {
          io.to(socketId).emit('Banned-From-A-Guild', NewOwnerInfo);
        }

        console.log('Guild disbanded successfully');
      } catch (error) {
        console.error('Error disbanding guild:', error);
      }
    });
    // Elder To Owner Message
    socket.on('Guild-Elder-Messages-E-TO-O', async (GuildId, ElderId, content) => {
      try {
        // Authenticate the guild and elder
        const guild = await authenticateGuildById(GuildId);
        const elder = await authenticateUserById(ElderId);

        if (!guild || !elder) {
          console.log('Guild or elder not authenticated');
          return;
        }

        // Check if the room with the given ID exists
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        // Find the guild document
        const guildDoc = await Guild.findById(GuildId);

        // Check if there is an existing conversation for the elder
        let conversation = guildDoc.guildElderMessages.find(
          (msg) => msg.ElderConvoStarter === elder.username
        );

        if (conversation) {
          // Add the new message to the existing conversation
          conversation.EldersMessages.push({
            sender: ElderId,
            senderUsername: elder.username, // Assuming elder has a username field
            content: content,
            timestamp: new Date()
          });
        } else {
          // Create a new conversation with the new message
          guildDoc.guildElderMessages.push({
            ElderConvoStarter: elder.username,
            EldersMessages: [{
              sender: ElderId,
              senderUsername: elder.username, // Assuming elder has a username field
              content: content,
              timestamp: new Date()
            }],
            OwnersMessages: []
          });
        }

        // Save the updated guild document
        await guildDoc.save();

        // Emit updates to everyone in the room
        io.to(GuildId).emit('guild-update', guildDoc);

      } catch (error) {
        console.error('Error updating elder messages:', error);
      }
    });

    // Owner To Elder Message
    socket.on('Guild-Elder-Messages-O-TO-E', async (GuildId, OwnerId, ElderUserName, content) => {
      try {
        // Authenticate the guild, elder, and owner
        const guild = await authenticateGuildById(GuildId);
        const elder = await authenticateUserByUsername(ElderUserName);
        const owner = await authenticateUserById(OwnerId);

        if (!guild || !elder || !owner) {
          console.log('Guild, elder, or owner not authenticated');
          return;
        }

        // Check if the room with the given ID exists
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        // Find the guild document
        const guildDoc = await Guild.findById(GuildId);

        // Check if there is an existing conversation for the elder
        let conversation = guildDoc.guildElderMessages.find(
          (msg) => msg.ElderConvoStarter === elder.username
        );

        if (conversation) {
          // Add the new message to the existing conversation
          conversation.OwnersMessages.push({
            sender: OwnerId,
            senderUsername: owner.username,
            content: content,
            timestamp: new Date()
          });
        } else {
          // Create a new conversation with the new message
          guildDoc.guildElderMessages.push({
            ElderConvoStarter: elder.username,
            EldersMessages: [],
            OwnersMessages: [{
              sender: OwnerId,
              senderUsername: owner.username,
              content: content,
              timestamp: new Date()
            }]
          });
        }

        // Save the updated guild document
        await guildDoc.save();

        // Emit updates to everyone in the room
        io.to(GuildId).emit('guild-update', guildDoc);

      } catch (error) {
        console.error('Error updating owner messages:', error);
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
// Function to authenticate user based on username
async function authenticateUserByUsername(username) {
  try {
    const foundUser = await User.findOne({ username: username });
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

    guild.bannedTravelers.push({ TravelerId: traveler._id || traveler.id, TravelerUserName: traveler.username, Reason: Reason });
    await guild.save();
    const updatedTraveler = await traveler.save();

    return updatedTraveler;
  } catch (error) {
    console.error('Error banning traveler from guild:', error);
    throw error;
  }
}
async function unbanMember(GuildId, TravelerId) {
  try {
    // Find the guild by ID
    const guild = await Guild.findById(GuildId);

    if (!guild) {
      console.log('Guild not found');
      return;
    }

    // Remove the traveler from the bannedTravelers array
    guild.bannedTravelers = guild.bannedTravelers.filter(bannedTraveler => !bannedTraveler.TravelerId.equals(TravelerId));

    // Save the updated guild document
    await guild.save();

    console.log(`Traveler with ID ${TravelerId} has been unbanned from guild ${GuildId}`);
  } catch (error) {
    console.error('Error unbanning member:', error);
  }
}
async function AcceptedToGuild(guild, traveler) {
  try {
    // Guild Part

    // Find the index of the traveler in guildJoinRequest array
    const travelerIndex = guild.guildJoinRequest.findIndex(
      trav => trav.id.toString() === traveler.id.toString() || trav._id.toString() === traveler.id.toString()
    );

    // If the traveler is found, remove them from guildJoinRequest
    if (travelerIndex !== -1) {
      guild.guildJoinRequest.splice(travelerIndex, 1); // Remove the traveler
    } else {
      throw new Error('Traveler not found in guild join requests.');
    }

    // Add the traveler to the guild's joinedTravelers array
    guild.joinedTravelers.push(traveler.id.toString() || traveler._id.toString());

    // Traveler Part

    // Add the guild to the traveler's guildsJoined array
    traveler.guildsJoined.push(guild.id.toString() || guild._id.toString());

    // Find the index of the guild in requestedGuilds array
    const guildIndex = traveler.requestedGuilds.findIndex(
      gld => gld.id.toString() === guild.id.toString() || gld._id.toString() === guild.id.toString()
    );

    // If the guild is found, remove it from requestedGuilds
    if (guildIndex !== -1) {
      traveler.requestedGuilds.splice(guildIndex, 1); // Remove the guild
    } else {
      throw new Error('Guild not found in traveler requested guilds.');
    }

    // Save changes to the database
    await Promise.all([guild.save(), traveler.save()]);

    // Fetch the updated traveler and guild
    const updatedTraveler = await User.findById(traveler.id.toString() || traveler._id.toString());
    const updatedGuild = await Guild.findById(guild.id.toString() || guild._id.toString());

    // Return both updated documents
    return { updatedTraveler, updatedGuild };
  } catch (error) {
    console.error('Error accepting traveler to guild:', error);
    throw error;
  }
}

async function DeclinedToGuild(guild, traveler) {
  try {
    // Guild Part

    // Find the index of the traveler in guildJoinRequest array
    const travelerIndex = guild.guildJoinRequest.findIndex(
      trav => trav.id.toString() === traveler.id.toString() || trav._id.toString() === traveler.id.toString()
    );

    // If the traveler is found, remove them from guildJoinRequest
    if (travelerIndex !== -1) {
      guild.guildJoinRequest.splice(travelerIndex, 1); // Remove the traveler
    } else {
      throw new Error('Traveler not found in guild join requests.');
    }

    // Find the index of the guild in requestedGuilds array
    const guildIndex = traveler.requestedGuilds.findIndex(
      gld => gld.id.toString() === guild.id.toString() || gld._id.toString() === guild.id.toString()
    );

    // If the guild is found, remove it from requestedGuilds
    if (guildIndex !== -1) {
      traveler.requestedGuilds.splice(guildIndex, 1); // Remove the guild
    } else {
      throw new Error('Guild not found in traveler requested guilds.');
    }

    // Save changes to the database
    await Promise.all([guild.save(), traveler.save()]);

    // Fetch the updated traveler and guild
    const updatedTraveler = await User.findById(traveler.id.toString() || traveler._id.toString());
    const updatedGuild = await Guild.findById(guild.id.toString() || guild._id.toString());

    // Return both updated documents
    return { updatedTraveler, updatedGuild };
  } catch (error) {
    console.error('Error accepting traveler to guild:', error);
    throw error;
  }
}
async function LeavingGuild(guild, traveler) {
  try {
    // Remove the traveler from the guild's joinedTravelers array
    await Guild.findByIdAndUpdate(
      guild._id,
      { $pull: { joinedTravelers: traveler._id } }
    );

    // Remove the guild from the traveler's guildsJoined array
    await User.findByIdAndUpdate(
      traveler._id,
      { $pull: { guildsJoined: guild._id } }
    );

    console.log(`Traveler with ID ${traveler._id} has left the guild with ID ${guild._id}`);
  } catch (error) {
    console.error('Error removing traveler from guild:', error);
  }
};
async function UpdateGuidelines(guild, newGuidelines) {
  try {
    // Update the guild's guidelines with the new guidelines
    guild.guildGuidelines = newGuidelines;

    // Save the updated guild object
    await guild.save();
  } catch (error) {
    // Log the error and rethrow it to propagate it up
    console.error('Error saving guidelines:', error);
    throw error;
  }
}