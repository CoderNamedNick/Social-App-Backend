const express = require('express');
const router = express.Router();
const Guild = require('../Models/Guild');
const User = require('../Models/User'); 

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
      guildOwner: userId, 
      guildGuidelines: '',
    });

    // Save the new guild
    const savedGuild = await newGuild.save();

    // Update the user's arrays
    user.guildsOwned.push(savedGuild._id); 
    user.guildsJoined.push(savedGuild._id); 
    
    // Save the updated user
    const updatedUser = await user.save();
    
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
  const GuildId = req.params.id; 
  const senderUserId = req.body.TravelerId; 

  try {
    // Find the guild
    const JoiningGuild = await Guild.findById(GuildId);
    if (!JoiningGuild) {
      return res.status(404).json({ message: 'Guild not found' });
    }

    JoiningGuild.guildJoinRequest.push(senderUserId);

    const SendingUser = await User.findById(senderUserId);
    if (!SendingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    SendingUser.requestedGuilds.push(GuildId);

    await Promise.all([JoiningGuild.save(), SendingUser.save()]);

    const updatedUser = await User.findById(senderUserId);

    res.json({ message: 'Join request sent successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send join request. Please try again later.' });
  }
});

// Update a guild's joinedTravelers and a user's guildsJoined
router.patch('/:id/Join', async (req, res) => {
  const GuildId = req.params.id; 
  const senderUserId = req.body.TravelerId; 

  try {
    const JoiningGuild = await Guild.findById(GuildId);
    if (!JoiningGuild) {
      return res.status(404).json({ message: 'Guild not found' });
    }

    JoiningGuild.joinedTravelers.push(senderUserId);

    const JoinedUser = await User.findById(senderUserId);
    if (!JoinedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    JoinedUser.guildsJoined.push(GuildId);

    await Promise.all([JoiningGuild.save(), JoinedUser.save()]);

    const updatedUser = await User.findById(senderUserId);

    res.json({ message: 'Joined successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to join. Please try again later.' });
  }
});

// Remove a guild's JoinRequest and a user's requestedGuilds
router.patch('/:id/Cancel-Join-Request', async (req, res) => {
  const GuildId = req.params.id;
  const senderUserId = req.body.TravelerId; 

  try {
    const JoiningGuild = await Guild.findById(GuildId);
    if (!JoiningGuild) {
      return res.status(404).json({ message: 'Guild not found' });
    }

    const index = JoiningGuild.guildJoinRequest.indexOf(senderUserId);
    if (index !== -1) {
      JoiningGuild.guildJoinRequest.splice(index, 1);
    }

    const SendingUser = await User.findById(senderUserId);
    if (!SendingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userIndex = SendingUser.requestedGuilds.indexOf(GuildId);
    if (userIndex !== -1) {
      SendingUser.requestedGuilds.splice(userIndex, 1);
    }

    await Promise.all([JoiningGuild.save(), SendingUser.save()]);

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