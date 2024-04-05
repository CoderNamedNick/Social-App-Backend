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
router.post('/', async (req, res) => {
  const { guildName, guildOwner, bio } = req.body;
  
  try {
    // Check if the guild owner exists
    const owner = await User.findById(guildOwner);
    if (!owner) {
      return res.status(404).json({ message: 'Owner user not found' });
    }
    
    // Create a new guild with the owner's ObjectId
    const newGuild = new Guild({
      guildName,
      guildOwner: owner._id, // Assign owner's ObjectId
      bio,
    });
    
    const savedGuild = await newGuild.save();

    // Fetch the saved guild with populated guildOwner
    const populatedGuild = await Guild.findById(savedGuild._id).populate('guildOwner', 'username');
    
    // Send response with the populated guild, including owner's username
    res.status(201).json(populatedGuild);
  } catch (err) {
    res.status(400).json({ message: err.message });
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