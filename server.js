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
const GuildPost = require('./Models/GuildPost')
const Message = require('./Models/Message');
const Report = require('./Models/Report')
const Party = require('./Models/Parties')

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
mongoose.connect('mongodb+srv://CoderNamedNick:Badz1100@atlascluster.1u4qn5c.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');

  const usersForConvos = {};
  const usersForMessages = {};
  const usersForParties = {};
  const usersForGuild = {};
  const usersForInTheMessages = {};

  // Event listener for incoming WebSocket connections
  io.on('connection', (socket) => {

    socket.on('storeUserIdForConvos', (userId) => {
      usersForConvos[userId] = socket.id;
    });
    socket.on('storeUserIdForMessages', (userId) => {
      usersForMessages[userId] = socket.id;
    });
    socket.on('storeUserIdForParties', (userId) => {
      usersForParties[userId] = socket.id;
    });
    socket.on('storeUserIdForGuild', (userId) => {
      usersForGuild[userId] = socket.id;
    });
    socket.on('storeUserIdForInTheMessages', (userId) => {
      usersForInTheMessages[userId] = socket.id;
    });
    socket.on('joinGuildRoom', (guildId) => {
      socket.guildRoom = guildId;
      socket.join(guildId); 
    });

    //GENERAL USE SOCKETS
    socket.on('update-user', async (userId) => {
      try {
        const user = await authenticateUserById(userId)

        if (!user) {
          return;
        }
        const socketId = usersForConvos[user._id || user.id];
        if (socketId) {
          io.to(socketId).emit('Updated-User-Data', user);
        }
      } catch (error) {
        console.error('Error fetching User-data:', error);
      }
    });

    //MESSAGES AND CONVOS SOCKETS

    // Event for Converstaion Count
    socket.on('Conversation-count', async (userId, cb) => {
      try {
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }

        const unreadConversationCount = await getConversationCount(user._id || user.id);

        cb(unreadConversationCount);
      } catch (error) {
        console.error('Error fetching Conversation count:', error);
      }
    });

    // Event for all Unread Messages Count
    socket.on('All-Unread-count', async (userId, cb) => {
      try {
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }
    
        const allunreadmessagesCount = await getAllUnreadMessagesCount(user._id || user.id);

        cb(allunreadmessagesCount);
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
          io.to(socketId4).emit('allunreadupdate', unreadMessageCount);
        }

        cb(unreadMessageCount);
      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });

    // Event for New Convo Start
    socket.on('new-convo', async (userId, companionId, ) => {
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
          io.to(socketId).emit('convo-count-update', unreadConversationCount);
          io.to(socketId).emit('allunreadupdate', NewUnreadNotifNumber);
        }
        const socketId2 = usersForMessages[companionId];
        if (socketId2) {
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
          io.to(socketId).emit('New-Message-update', Conversation);
        }
        const socketId2 = usersForInTheMessages[senderId];
        if (socketId2) {
          io.to(socketId2).emit('New-Message-update', Conversation);
        }
        const socketId3 = usersForMessages[theCompanion._id || theCompanion.id];
        if (socketId3) {
          io.to(socketId3).emit('message-count-update', theUser.id || theUser._id, unreadMessageCount);
        }
        const socketId4 = usersForConvos[theCompanion._id || theCompanion.id];
        if (socketId4) {
          io.to(socketId4).emit('allunreadupdate', unreadMessageCount);
        }
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
          return;
        }

        const NewUnreadNotifNumber = await MarkAsRead(theUser._id || theUser.id, theUser.username ,theCompanion._id || theCompanion.id);

        const socketId = usersForConvos[theUser._id || theUser.id];
        if (socketId) {
          io.to(socketId).emit('allunreadupdate', NewUnreadNotifNumber);
        }
        const socketId2 = usersForInTheMessages[theUser._id || theUser.id];
        if (socketId2) {
          io.to(socketId2).emit('Read-update', NewUnreadNotifNumber);
        }
      } catch (error) {
        console.error('Error fetching Message count:', error);
      }
    });

    // PARTY SOCKETS
    socket.on('Find-Parties', async (userId) => {
      try {
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }

        const parties = await Party.find({ messengers: userId });

        socket.emit('Parties-Found', parties);
      } catch (error) {
        console.error('Error fetching parties:', error);
      }
    });

    socket.on('get-party-messages', async (PartyID, callback) => {
      try {
        const party = await Party.findById(PartyID);
        if (!party) {
          callback({ error: 'Party not found' });
          return;
        }

        const messages = party.messages;
        callback({ messages });
      } catch (error) {
        console.error('Error fetching party messages:', error);
        callback({ error: 'Failed to fetch messages' });
      }
    });

    socket.on('Create-Party', async ({ creatorId, messengers, partyname }) => {
      try {
        const creator = await authenticateUserById(creatorId);
        if (!creator) {
          console.log('Creator not authenticated');
          return;
        }

        const authenticatedMessengers = await Promise.all(messengers.map(async ({ userId, userName }) => {
          const user = await authenticateUserById(userId);
          if (!user) {
            throw new Error(`User with ID ${userId} not authenticated`);
          }
          return { userId, userName };
        }));

        authenticatedMessengers.push({ userId: creatorId, userName: creator.username });

        const newParty = new Party({
          creatorId: creatorId,
          creatorUserName: creator.username,
          partyname: partyname,
          messengers: authenticatedMessengers.map(m => m.userId),
          UserNames: authenticatedMessengers.map(m => m.userName),
          messages: [],
        });
    
        await newParty.save();

        socket.emit('Party-Created', newParty);
      } catch (error) {
        console.error('Error creating party:', error);
        socket.emit('Error', 'Error creating party');
      }
    });
    
    socket.on('Leave-Party', async (userId, partyId) => {
      try {
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }

        const party = await Party.findById(partyId);
        if (!party) {
          console.log('No party found');
          return;
        }
    
        party.messengers.pull(userId);
        party.UserNames = party.UserNames.filter(name => name !== user.username); 

        if (party.UserNames.length === 0) {
          await party.deleteOne(); 
          console.log('Party deleted as it had no more members');
        } else {
          await party.save(); 
        }
    
        const socketId = usersForInTheMessages[userId];
        if (socketId) {
          io.to(socketId).emit('Left-Party', partyId);
        }
        
      } catch (error) {
        console.error('Error leaving party:', error);
        socket.emit('Error', 'Error leaving party');
      }
    });
    
    socket.on('Send-Message-To-Party', async (userId, partyId, message) => {
      try {
        const user = await authenticateUserById(userId);
        if (!user) {
          console.log('User not authenticated');
          return;
        }

        const party = await Party.findById(partyId);
        if (!party) {
          socket.emit('Error', 'Party not found');
          return;
        }
    
        const newMessage = {
          sender: userId,
          senderUsername: user.username, 
          content: message,
          timestamp: new Date()
        };
    
        party.messages.push(newMessage);
        await party.save();
    
        const messengers = party.messengers.map(messenger => messenger.toString());
        messengers.forEach(messengerId => {
          const socketId = usersForInTheMessages[messengerId];
          if (socketId) {
            io.to(socketId).emit('Message-to-Party-update', party);
          }
        });
    
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('Error', 'Error sending message');
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
      try {
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        await promoteToElder(guild, traveler);

        const updatedGuild = await Guild.findById(GuildId);

        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });

    //demotes elder to member
    socket.on('demote-to-member', async (GuildId, TravelerId ) => {
      try {
        console.log('trying update to elder')
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        await demoteToMember(guild, traveler);

        const updatedGuild = await Guild.findById(GuildId);

        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);
    
        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });

    //new member joined
    socket.on('New-member', async (GuildId, TravelerId ) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const updatedGuild = await Guild.findById(GuildId);

        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });

    //ban member
    socket.on('Ban-member', async (GuildId, TravelerId, Reason ) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const NewUserInfo = await BanFromGuild(guild, traveler, Reason)

        const updatedGuild = await Guild.findById(GuildId);

        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

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
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
    
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        await unbanMember(GuildId, TravelerId)

        const updatedGuild = await Guild.findById(GuildId);

        io.to(GuildId).emit('guild-update', updatedGuild);

      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });

    //Report member
    socket.on('Report-member', async (GuildId, TravelerId, Reason) => {
      try {

        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
        
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

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
    
        io.to(GuildId).emit('guild-update', updatedGuild);
      } catch (error) {
        console.error('Error reporting member:', error);
      }
    });

    //Remove Report
    socket.on('Remove-Report', async (GuildId, ReportId) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        
        if (!guild) {
          console.log('Guild not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

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

        io.to(GuildId).emit('guild-update', updatedGuild);
      } catch (error) {
        console.error('Error removing report:', error);
      }
    });

    //Warn member
    socket.on('Warn-member', async (GuildId, TravelerId, Reason) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);
        
        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

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

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const ReqToJoinTavelers = [];

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
    
        io.to(GuildId).emit('guildReqUpdates', updatedGuild, joinRequestCount, ReqToJoinTavelers);
      } catch (error) {
        console.error('Error updating to elder:', error);
      }
    });

    // New member request Accepted
    socket.on('New-member-Accepted', async (GuildId, TravelerId) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);

        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const updatedValues = await AcceptedToGuild(guild, traveler);

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

        const ReqToJoinTavelers = ReqToJoinTravelers1.filter(trav => trav !== null);

        const updatedGuild = await Guild.findById(GuildId);

        const joinRequestCount = updatedGuild.guildJoinRequest.length;
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

        const NewUserData = await User.findById(TravelerId);

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
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);

        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const updatedValues = await DeclinedToGuild(guild, traveler);

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

        const ReqToJoinTavelers = ReqToJoinTravelers1.filter(trav => trav !== null);

        const updatedGuild = await Guild.findById(GuildId);

        const joinRequestCount = updatedGuild.guildJoinRequest.length;
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

        io.to(GuildId).emit('memberUpdates', guildMembersWithElders);
        io.to(GuildId).emit('guildReqUpdates', updatedGuild, joinRequestCount, ReqToJoinTavelers);

      } catch (error) {
        console.error('Error declining new member:', error);
      }
    });

    // guidelines update
    socket.on('Guidelines-updated', async (GuildId, NewGuidelines) => {
      try {
        const guild = await authenticateGuildById(GuildId);

        if (!guild) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

       await UpdateGuidelines(guild, NewGuidelines);

        const updatedGuild = await Guild.findById(GuildId);

        io.to(GuildId).emit('Guild-Settings-updates', updatedGuild);
      } catch (error) {
        console.error('Error updating guidelines:', error);
      }
    });

    // Leaving Guild
    socket.on('Retire-From-Guild', async (GuildId, TravelerId) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);

        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        await LeavingGuild(guild, traveler);

        const updatedGuild = await Guild.findById(GuildId);
        const NewUserInfo = await User.findById(traveler.id || traveler._id)
        const guildMembersWithElders = await getGuildMembersAndElders(updatedGuild);

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

    // Disband-Guild 
    socket.on('Disband-Guild', async (GuildId, TravelerId) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const traveler = await authenticateUserById(TravelerId);

        if (!guild || !traveler) {
          console.log('Guild or traveler not authenticated');
          return;
        }

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

        if (!traveler.guildsOwned.includes(GuildId)) {
          console.log('Traveler does not own this guild');
          return;
        }

        await User.findByIdAndUpdate(
          TravelerId,
          {
            $pull: {
              guildsOwned: GuildId,
              guildsJoined: GuildId
            }
          }
        );

        await Guild.findByIdAndDelete(GuildId);
        await GuildPost.findOneAndDelete({ Guild: GuildId });

        const NewOwnerInfo = await User.findById(TravelerId)
        const socketId = usersForConvos[TravelerId];
        if (socketId) {
          io.to(socketId).emit('Banned-From-A-Guild', NewOwnerInfo);
        }

      } catch (error) {
        console.error('Error disbanding guild:', error);
      }
    });

    // Elder To Owner Message
    socket.on('Guild-Elder-Messages-E-TO-O', async (GuildId, ElderId, content) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const elder = await authenticateUserById(ElderId);

        if (!guild || !elder) {
          console.log('Guild or elder not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const guildDoc = await Guild.findById(GuildId);

        let conversation = guildDoc.guildElderMessages.find(
          (msg) => msg.ElderConvoStarter === elder.username
        );

        if (conversation) {
          conversation.EldersMessages.push({
            sender: ElderId,
            senderUsername: elder.username, 
            content: content,
            timestamp: new Date()
          });
        } else {
          guildDoc.guildElderMessages.push({
            ElderConvoStarter: elder.username,
            EldersMessages: [{
              sender: ElderId,
              senderUsername: elder.username, 
              content: content,
              timestamp: new Date()
            }],
            OwnersMessages: []
          });
        }

        await guildDoc.save();

        io.to(GuildId).emit('guild-update', guildDoc);
      } catch (error) {
        console.error('Error updating elder messages:', error);
      }
    });

    // Owner To Elder Message
    socket.on('Guild-Elder-Messages-O-TO-E', async (GuildId, OwnerId, ElderUserName, content) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const elder = await authenticateUserByUsername(ElderUserName);
        const owner = await authenticateUserById(OwnerId);

        if (!guild || !elder || !owner) {
          console.log('Guild, elder, or owner not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const guildDoc = await Guild.findById(GuildId);

        let conversation = guildDoc.guildElderMessages.find(
          (msg) => msg.ElderConvoStarter === elder.username
        );

        if (conversation) {
          conversation.OwnersMessages.push({
            sender: OwnerId,
            senderUsername: owner.username,
            content: content,
            timestamp: new Date()
          });
        } else {
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

        await guildDoc.save();

        io.to(GuildId).emit('guild-update', guildDoc);

      } catch (error) {
        console.error('Error updating owner messages:', error);
      }
    });

    // get Alerts & Post on load
    socket.on('Get-Alerts-And-Post', async (GuildId) => {
      try {
        const guild = await authenticateGuildById(GuildId);

        if (!guild) {
          console.log('Guild not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        let guildDoc = await GuildPost.findOne({ Guild: GuildId });

        io.to(GuildId).emit('Guild-Alerts-And-Post', guildDoc);
      } catch (error) {
        console.error('Error creating guild alert:', error);
      }
    });

    // Handle Get-Posts event
    socket.on('Get-Posts', async (GuildId, UserId) => {
      try {
        const guild = await authenticateGuildById(GuildId);

        if (!guild) {
          console.log('Guild not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        let guildDoc = await GuildPost.findOne({ Guild: GuildId });

        const socketId = usersForGuild[UserId];
        if (socketId) {
          io.to(socketId).emit('Guild-Posts-Refresh', guildDoc);
        } else {
          console.log('User not found in usersForGuild:', UserId);
        }
      } catch (error) {
        console.error('Error refreshing:', error);
      }
    });

    socket.on('Get-your-Posts', async (GuildId, UserId) => {
      try {
        const guild = await authenticateGuildById(GuildId);
    
        if (!guild) {
          console.log('Guild not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const userPosts = await GuildPost.aggregate([
          { $match: { Guild: mongoose.Types.ObjectId(GuildId) } },
          {
            $project: {
              post: {
                $filter: {
                  input: '$post',
                  as: 'post',
                  cond: { $eq: ['$$post.Poster', mongoose.Types.ObjectId(UserId)] }
                }
              }
            }
          }
        ]);
    
        if (!userPosts || userPosts.length === 0 || userPosts[0].post.length === 0) {
          console.log('No posts found for User:', UserId);
          return;
        }

        const socketId = usersForGuild[UserId];
        if (socketId) {
          io.to(socketId).emit('Guild-Posts-Refresh', userPosts[0].post);
        } else {
          console.log('User not found in usersForGuild:', UserId);
        }
      } catch (error) {
        console.error('Error refreshing:', error);
      }
    });

    // Send Guild Post returs all alerts
    socket.on('Send-Guild-Post', async (GuildId, PosterId, content) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const poster = await authenticateUserById(PosterId);

        if (!guild || !poster) {
          console.log('Guild or poster not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        let guildDoc = await GuildPost.findOne({ Guild: GuildId });

        if (!guildDoc) {
          guildDoc = new GuildPost({ Guild: GuildId });
        }

        const post = {
          Poster: poster._id || poster.id,
          PosterUserName: poster.username,
          content: content,
          timestamp: new Date(),
          Likes: 0,
          Dislikes: 0,
          comments: [],
        };

        guildDoc.post.push(post);

        await guildDoc.save();

        io.to(GuildId).emit('Guild-Post', guildDoc.post);
        io.to(GuildId).emit('New-Post-Notif', );
      } catch (error) {
        console.error('Error creating guild post:', error);
      }
    });

    // Handle like event
    socket.on('like-post', async ({ postId, username }, GuildId) => {
      try {
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }
        const guildPost = await GuildPost.findOne({ 'post._id': postId });
        if (guildPost) {
          const post = guildPost.post.id(postId);
          if (post && !post.LikesList.includes(username)) {
            post.LikesList.push(username);
            post.Likes = post.LikesList.length;

            const dislikeIndex = post.DislikesList.indexOf(username);
            if (dislikeIndex !== -1) {
              post.DislikesList.splice(dislikeIndex, 1);
              post.Dislikes = post.DislikesList.length;
            }

            await guildPost.save();

            io.to(GuildId).emit('Post-like', { postId, username });
          }
        }
      } catch (error) {
        console.error('Error handling like alert:', error);
      }
    });

    // Handle dislike event
    socket.on('dislike-post', async ({ postId, username}, GuildId) => {
      try {
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }
        const guildPost = await GuildPost.findOne({ 'post._id': postId });
        if (guildPost) {
          const post = guildPost.post.id(postId);
          if (post && !post.DislikesList.includes(username)) {
            post.DislikesList.push(username);
            post.Dislikes = post.DislikesList.length;

            const likeIndex = post.LikesList.indexOf(username);
            if (likeIndex !== -1) {
              post.LikesList.splice(likeIndex, 1);
              post.Likes = post.LikesList.length;
            }

            await guildPost.save();

            io.to(GuildId).emit('Post-dislike', { postId, username });
          }
        }
      } catch (error) {
        console.error('Error handling dislike alert:', error);
      }
    });

    // Handle Remove-Reaction event
    socket.on('Post-Remove-Reaction', async ({ postId, username}, GuildId) => {
      try {
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const guildPost = await GuildPost.findOne({ 'post._id': postId });
        if (guildPost) {
          const post = guildPost.post.id(postId);

          const dislikeIndex = post.DislikesList.indexOf(username);
          if (dislikeIndex !== -1) {
            post.DislikesList.splice(dislikeIndex, 1);
            post.Dislikes = post.DislikesList.length;
          }

          const likeIndex = post.LikesList.indexOf(username);
          if (likeIndex !== -1) {
            post.LikesList.splice(likeIndex, 1);
            post.Likes = post.LikesList.length;
          }

          await guildPost.save();

          io.to(GuildId).emit('Post-Removed-reaction', { postId, username });
        }
      } catch (error) {
        console.error('Error handling Remove-Reaction:', error);
      }
    });

    // Handle comment event
    socket.on('Comment-post', async (postId, CommenterId, GuildId, comment) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const Commenter = await authenticateUserById(CommenterId);

        if (!guild || !Commenter) {
          console.log('Guild or commenter not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        let guildDoc = await GuildPost.findOne({ Guild: GuildId });
        if (!guildDoc) {
          console.log('Guild document not found for GuildId:', GuildId);
          return;
        }

        let post = guildDoc.post.id(postId);
        if (!post) {
          console.log('Post not found with postId:', postId);
          return;
        }

        const newComment = {
          id: new Date().toISOString(),
          commentingUser: CommenterId,
          commentingUserName: Commenter.username,
          commentPost: {
            content: comment.commentPost.content,
            timestamp: new Date()
          }
        };

        post.comments.push(newComment);

        await guildDoc.save();

        const socketId = usersForGuild[CommenterId];
        if (socketId) {
          io.to(socketId).emit('Comment-added', postId, newComment );
        }
      } catch (error) {
        console.error('Error handling comment post:', error);
      }
    });

    // get Alerts
    socket.on('Get-Alerts', async (GuildId, UserId) => {
      try {
        const guild = await authenticateGuildById(GuildId);

        if (!guild) {
          console.log('Guild not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        let guildDoc = await GuildPost.findOne({ Guild: GuildId });

        const socketId = usersForGuild[UserId];
        if (socketId) {
          io.to(socketId).emit('Guild-Alerts-Refresh', guildDoc );
        }
      } catch (error) {
        console.error('Error creating guild alert:', error);
      }
    });

    // Send Guild Alert returs all alerts
    socket.on('Send-Guild-Alert', async (GuildId, OwnerId, content) => {
      try {
        const guild = await authenticateGuildById(GuildId);
        const owner = await authenticateUserById(OwnerId);

        if (!guild || !owner) {
          console.log('Guild or owner not authenticated');
          return;
        }

        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        let guildDoc = await GuildPost.findOne({ Guild: GuildId });

        if (!guildDoc) {
          guildDoc = new GuildPost({ Guild: GuildId });
        }

        const alert = {
          Poster: owner._id,
          PosterUserName: owner.username,
          content: content,
          timestamp: new Date(),
          Likes: 0,
          Dislikes: 0
        };

        guildDoc.Alerts.push(alert);

        await guildDoc.save();

        io.to(GuildId).emit('Guild-Alert', guildDoc.Alerts);
      } catch (error) {
        console.error('Error creating guild alert:', error);
      }
    });

    // Handle like event
    socket.on('like-alert', async ({ alertId, username }, GuildId) => {
      try {
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }
        const guildPost = await GuildPost.findOne({ 'Alerts._id': alertId });
        if (guildPost) {
          const alert = guildPost.Alerts.id(alertId);
          if (alert && !alert.LikesList.includes(username)) {
            alert.LikesList.push(username);
            alert.Likes = alert.LikesList.length;

            const dislikeIndex = alert.DislikesList.indexOf(username);
            if (dislikeIndex !== -1) {
              alert.DislikesList.splice(dislikeIndex, 1);
              alert.Dislikes = alert.DislikesList.length;
            }

            await guildPost.save();

            io.to(GuildId).emit('Alert-like', { alertId, username });
          }
        }
      } catch (error) {
        console.error('Error handling like alert:', error);
      }
    });

    // Handle dislike event
    socket.on('dislike-alert', async ({ alertId, username}, GuildId) => {
      try {
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }
        const guildPost = await GuildPost.findOne({ 'Alerts._id': alertId });
        if (guildPost) {
          const alert = guildPost.Alerts.id(alertId);
          if (alert && !alert.DislikesList.includes(username)) {
            alert.DislikesList.push(username);
            alert.Dislikes = alert.DislikesList.length;

            const likeIndex = alert.LikesList.indexOf(username);
            if (likeIndex !== -1) {
              alert.LikesList.splice(likeIndex, 1);
              alert.Likes = alert.LikesList.length;
            }

            await guildPost.save();

            io.to(GuildId).emit('Alert-dislike', { alertId, username });
          }
        }
      } catch (error) {
        console.error('Error handling dislike alert:', error);
      }
    });

    // Handle Remove-Reaction event
    socket.on('Alert-Remove-Reaction', async ({ alertId, username}, GuildId) => {
      try {
        const roomExists = io.sockets.adapter.rooms.has(GuildId);
        if (!roomExists) {
          console.log('Room does not exist for GuildId:', GuildId);
          return;
        }

        const guildPost = await GuildPost.findOne({ 'Alerts._id': alertId });
        if (guildPost) {
          const alert = guildPost.Alerts.id(alertId);

          const dislikeIndex = alert.DislikesList.indexOf(username);
          if (dislikeIndex !== -1) {
            alert.DislikesList.splice(dislikeIndex, 1);
            alert.Dislikes = alert.DislikesList.length;
          }

          const likeIndex = alert.LikesList.indexOf(username);
          if (likeIndex !== -1) {
            alert.LikesList.splice(likeIndex, 1);
            alert.Likes = alert.LikesList.length;
          }

          await guildPost.save();

          io.to(GuildId).emit('Alert-Removed-reaction', { alertId, username });
        }
      } catch (error) {
        console.error('Error handling Remove-Reaction:', error);
      }
    });

    // Event listener for WebSocket connection closure
    socket.on('disconnect', () => {
      console.log('Socket.IO connection disconnected');
      const userId = Object.keys(usersForConvos).find(key => usersForConvos[key] === socket.id);
      if (userId) {
        delete usersForConvos[userId];
      }
      const userId2 = Object.keys(usersForMessages).find(key => usersForMessages[key] === socket.id);
      if (userId2) {
        delete usersForMessages[userId2];
      }
      const userId3 = Object.keys(usersForGuild).find(key => usersForGuild[key] === socket.id);
      if (userId3) {
        delete usersForGuild[userId3];
      }
      if (socket.guildRoom) {
        socket.leave(socket.guildRoom);
        delete socket.guildRoom;
      }
    });
  });
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

//MIDDLE WARE FUNCTIONS

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
      messengers: userId, 
    });

    if (!conversations || conversations.length === 0) {
      return 0;
    }

    let unreadCount = 0;
    conversations.forEach(conversation => {
      conversation.messages.forEach(message => {
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
      if (!conversation.UserNames.includes(senderUsername)) {
        conversation.UserNames.push(senderUsername);
      }
      if (!conversation.UserNames.includes(receiverUsername)) {
        conversation.UserNames.push(receiverUsername);
      }

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

    let newNotifCount = 0;
    for (const message of conversation.messages) {
      if (message.sender !== userId && !message.read && message.senderUsername !== userName) {
        message.read = true;
        await message.save({ suppressWarning: true }); 
      }
    }

    await conversation.save({ suppressWarning: true }); 

    return newNotifCount;
  } catch (error) {
    throw error;
  }
}

async function promoteToElder(guild, traveler) {
  try {
    const travelerIndex = guild.joinedTravelers.findIndex(member => member.id.toString() === traveler.id.toString() || member._id.toString() === traveler.id.toString());

    if (travelerIndex !== -1) {
      guild.joinedTravelers.splice(travelerIndex, 1); 
    } else {
      throw new Error('Traveler not found in joined members.');
    }

    guild.guildElders.push(traveler);

    await guild.save();

  } catch (error) {
    console.error('Error promoting traveler to elder:', error);
    throw error; 
  }
}

async function demoteToMember(guild, elder) {
  try {
    const elderIndex = guild.guildElders.findIndex(member => member.id.toString() === elder.id.toString() || member._id.toString() === elder.id.toString());

    if (elderIndex !== -1) {
      guild.guildElders.splice(elderIndex, 1); 
    } else {
      throw new Error('Elder not found in guild elders.');
    }

    guild.joinedTravelers.push(elder);

    await guild.save();

  } catch (error) {
    console.error('Error demoting elder to member:', error);
    throw error; 
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
    } else if (travelerIndex !== -1) {
      guild.joinedTravelers.splice(travelerIndex, 1);
    } else {
      throw new Error('Traveler not found in joined members or elder.');
    }

    traveler.guildsJoined = traveler.guildsJoined.filter(guildId => {
      const shouldKeep = guildId.toString() !== guild.id.toString();
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
    const guild = await Guild.findById(GuildId);

    if (!guild) {
      console.log('Guild not found');
      return;
    }

    guild.bannedTravelers = guild.bannedTravelers.filter(bannedTraveler => !bannedTraveler.TravelerId.equals(TravelerId));

    await guild.save();

  } catch (error) {
    console.error('Error unbanning member:', error);
  }
}
async function AcceptedToGuild(guild, traveler) {
  try {
    const travelerIndex = guild.guildJoinRequest.findIndex(
      trav => trav.id.toString() === traveler.id.toString() || trav._id.toString() === traveler.id.toString()
    );

    if (travelerIndex !== -1) {
      guild.guildJoinRequest.splice(travelerIndex, 1); 
    } else {
      throw new Error('Traveler not found in guild join requests.');
    }

    guild.joinedTravelers.push(traveler.id.toString() || traveler._id.toString());


    traveler.guildsJoined.push(guild.id.toString() || guild._id.toString());

    const guildIndex = traveler.requestedGuilds.findIndex(
      gld => gld.id.toString() === guild.id.toString() || gld._id.toString() === guild.id.toString()
    );

    if (guildIndex !== -1) {
      traveler.requestedGuilds.splice(guildIndex, 1);
    } else {
      throw new Error('Guild not found in traveler requested guilds.');
    }

    await Promise.all([guild.save(), traveler.save()]);

    const updatedTraveler = await User.findById(traveler.id.toString() || traveler._id.toString());
    const updatedGuild = await Guild.findById(guild.id.toString() || guild._id.toString());

    return { updatedTraveler, updatedGuild };
  } catch (error) {
    console.error('Error accepting traveler to guild:', error);
    throw error;
  }
}

async function DeclinedToGuild(guild, traveler) {
  try {
    const travelerIndex = guild.guildJoinRequest.findIndex(
      trav => trav.id.toString() === traveler.id.toString() || trav._id.toString() === traveler.id.toString()
    );

    if (travelerIndex !== -1) {
      guild.guildJoinRequest.splice(travelerIndex, 1); 
    } else {
      throw new Error('Traveler not found in guild join requests.');
    }

    const guildIndex = traveler.requestedGuilds.findIndex(
      gld => gld.id.toString() === guild.id.toString() || gld._id.toString() === guild.id.toString()
    );

    if (guildIndex !== -1) {
      traveler.requestedGuilds.splice(guildIndex, 1); 
    } else {
      throw new Error('Guild not found in traveler requested guilds.');
    }

    await Promise.all([guild.save(), traveler.save()]);

    const updatedTraveler = await User.findById(traveler.id.toString() || traveler._id.toString());
    const updatedGuild = await Guild.findById(guild.id.toString() || guild._id.toString());

    return { updatedTraveler, updatedGuild };
  } catch (error) {
    console.error('Error accepting traveler to guild:', error);
    throw error;
  }
}

async function LeavingGuild(guild, traveler) {
  try {
    await Guild.findByIdAndUpdate(
      guild._id,
      { $pull: { joinedTravelers: traveler._id } }
    );

    await User.findByIdAndUpdate(
      traveler._id,
      { $pull: { guildsJoined: guild._id } }
    );

  } catch (error) {
    console.error('Error removing traveler from guild:', error);
  }
};

async function UpdateGuidelines(guild, newGuidelines) {
  try {
    guild.guildGuidelines = newGuidelines;

    await guild.save();
  } catch (error) {
    console.error('Error saving guidelines:', error);
    throw error;
  }
}