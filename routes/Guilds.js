const express = require('express');
const router = express.Router();
const Guild = require('../Models/Guild');
const User = require('../Models/User'); // Import the User model

// Get all guilds
router.get('/', async (req, res) => {
  try {
    const guilds = await Guild.find();
    res.json(guilds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get guild by guildName
router.get('/guildname/:guildname', getGuildByGuildName, (req, res) => {
  res.json(res.guild);
});

// Get guild by ID
router.get('/id/:id', getGuildByID, (req, res) => {
  res.json(res.guild);
});

//get all users associated with guild
router.get('/JoinedTravelers/:id', async (req, res) => {
  const guildId = req.params.id;

  try {
    const guild = await Guild.findById(guildId);
    
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }

    const guildElders = [];
    const guildMembers = [];

    const Owner = await User.findById(guild.guildOwner);

    const guildOwner = {
      id: Owner.id || Owner._id,
      UserName: Owner.username,
      AccPrivate: Owner.AccPrivate
    }

    // Fetch guild members
    for (const traveler of guild.joinedTravelers) {
      try {
        const traveler1 = await User.findById(traveler);
        guildMembers.push({
          id: traveler1.id || traveler1._id,
          UserName: traveler1.username,
          AccPrivate: traveler1.AccPrivate
        });
      } catch (err) {
        console.error('Error fetching guild member:', err.message);
      }
    }

    // Fetch guild elders
    for (const Elder of guild.guildElders) {
      try {
        const Elder1 = await User.findById(Elder);
        guildElders.push({
          id: Elder1.id || Elder1._id,
          UserName: Elder1.username,
          AccPrivate: Elder1.AccPrivate,
        });
      } catch (err) {
        console.error('Error fetching guild elder:', err.message);
      }
    }
    
    res.status(200).json({ message: 'Arrays with usernames', Owner:guildOwner , Elders: guildElders, Members: guildMembers });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//get all users that requested to join
router.get('/ReqToJoinTavelers/:id', async (req, res) => {
  const guildId = req.params.id;

  try {
    const guild = await Guild.findById(guildId);
    
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
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
    
    res.status(200).json({ message: 'Arrays with usernames', traveler: ReqToJoinTavelers });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Create a guild
router.post('/:userId/make-guild', async (req, res) => {
  const userId = req.params.userId;
  const { guildName, guildMoto, bio, guildColor, RequestToJoin, Findable } = req.body;

  try {
    // Fetch the user by userId
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create the new guild
    const newGuild = new Guild({
      guildName,
      guildMoto,
      bio,
      guildColor,
      RequestToJoin,
      Findable,
      guildOwner: userId, // Assign the user as the guild owner
      guildGuidelines: '',
    });

    // Save the new guild
    const savedGuild = await newGuild.save();

    // Update the user's arrays
    user.guildsOwned.push(savedGuild._id); // Add guild to guildsOwned
    user.guildsJoined.push(savedGuild._id); // Add guild to guildsJoined
    
    // Save the updated user
    const updatedUser = await user.save();
    
    // Send a success response with the updated user data and the created guild
    res.status(200).json({ message: 'Guild created and user updated successfully', user: updatedUser, guild: savedGuild });
  } catch (error) {
    console.error('Error creating guild:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a guild
router.patch('/id/:id', getGuildByID, async (req, res) => {
  if (req.body.guildOwner != null) {
    res.guild.guildOwner = req.body.guildOwner;
  }
  if (req.body.guildMoto != null) {
    res.guild.guildMoto = req.body.guildMoto;
  }
  if (req.body.bio != null) {
    res.guild.bio = req.body.bio;
  }
  if (req.body.RequestToJoin != null) {
    res.guild.RequestToJoin = req.body.RequestToJoin;
  }
  if (req.body.Findable != null) {
    res.guild.Findable = req.body.Findable;
  }
  if (req.body.guildColor != null) {
    res.guild.guildColor = req.body.guildColor;
  }
  try {
    const updatedGuild = await res.guild.save();
    res.json(updatedGuild);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// Update a guild's JoinRequest and a user's requestedGuilds
router.patch('/:id/Join-Request', async (req, res) => {
  const GuildId = req.params.id; // Changed to match parameter name
  const senderUserId = req.body.TravelerId; // Extract travelerId from the request body

  try {
    // Find the guild
    const JoiningGuild = await Guild.findById(GuildId);
    if (!JoiningGuild) {
      return res.status(404).json({ message: 'Guild not found' });
    }

    // Push the senderUserId to the guildJoinRequest array of the guild
    JoiningGuild.guildJoinRequest.push(senderUserId);

    // Find the user who is sending the join request
    const SendingUser = await User.findById(senderUserId);
    if (!SendingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Push the guildId to the requestedGuilds array of the user
    SendingUser.requestedGuilds.push(GuildId);

    // Save changes to both the guild and the user
    await Promise.all([JoiningGuild.save(), SendingUser.save()]);

    // Fetch updated user information
    const updatedUser = await User.findById(senderUserId);

    res.json({ message: 'Join request sent successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send join request. Please try again later.' });
  }
});
// Update a guild's joinedTravelers and a user's guildsJoined
router.patch('/:id/Join', async (req, res) => {
  const GuildId = req.params.id; // Changed to match parameter name
  const senderUserId = req.body.TravelerId; // Extract travelerId from the request body

  try {
    // Find the guild
    const JoiningGuild = await Guild.findById(GuildId);
    if (!JoiningGuild) {
      return res.status(404).json({ message: 'Guild not found' });
    }

    // Push the senderUserId (travelerId) to the joinedTravelers array of the guild
    JoiningGuild.joinedTravelers.push(senderUserId);

    // Find the user who is joining the guild
    const JoinedUser = await User.findById(senderUserId);
    if (!JoinedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Push the guildId to the guildsJoined array of the user
    JoinedUser.guildsJoined.push(GuildId);

    // Save changes to both the guild and the user
    await Promise.all([JoiningGuild.save(), JoinedUser.save()]);

    // Fetch updated user information
    const updatedUser = await User.findById(senderUserId);

    res.json({ message: 'Joined successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to join. Please try again later.' });
  }
});
// Remove a guild's JoinRequest and a user's requestedGuilds
router.patch('/:id/Cancel-Join-Request', async (req, res) => {
  const GuildId = req.params.id; // Changed to match parameter name
  const senderUserId = req.body.TravelerId; // Extract travelerId from the request body

  try {
    // Find the guild
    const JoiningGuild = await Guild.findById(GuildId);
    if (!JoiningGuild) {
      return res.status(404).json({ message: 'Guild not found' });
    }

    // Remove the senderUserId from the guildJoinRequest array of the guild
    const index = JoiningGuild.guildJoinRequest.indexOf(senderUserId);
    if (index !== -1) {
      JoiningGuild.guildJoinRequest.splice(index, 1);
    }

    // Find the user who sent the join request
    const SendingUser = await User.findById(senderUserId);
    if (!SendingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove the guildId from the requestedGuilds array of the user
    const userIndex = SendingUser.requestedGuilds.indexOf(GuildId);
    if (userIndex !== -1) {
      SendingUser.requestedGuilds.splice(userIndex, 1);
    }

    // Save changes to both the guild and the user
    await Promise.all([JoiningGuild.save(), SendingUser.save()]);

    // Fetch updated user information
    const updatedUser = await User.findById(senderUserId);

    res.json({ message: 'Join request cancelled successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to cancel join request. Please try again later.' });
  }
});
// Delete a guild
router.delete('/id/:id', getGuildByID, async (req, res) => {
  try {
    await res.guild.remove();
    res.json({ message: "Guild deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware to get guild by ID
async function getGuildByID(req, res, next) {
  try {
    const guild = await Guild.findById(req.params.id);
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    res.guild = guild;
    next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// Middleware to get guild by guildName
async function getGuildByGuildName(req, res, next) {
  try {
    const guild = await Guild.findOne({ guildName: req.params.guildname });
    if (!guild) {
      return res.status(404).json({ message: 'Guild not found' });
    }
    res.guild = guild;
    next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = router;