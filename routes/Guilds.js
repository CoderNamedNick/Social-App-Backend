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