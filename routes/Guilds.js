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
      guildOwner: userId // Assign the user as the guild owner
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
  if (req.body.guildName != null) {
    res.guild.guildName = req.body.guildName;
  }
  if (req.body.bio != null) {
    res.guild.bio = req.body.bio;
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