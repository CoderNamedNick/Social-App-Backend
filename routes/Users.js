const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for creating JWT tokens
const User = require('../Models/User');
const Guild = require('../Models/Guild');

//Getting All
router.get('/', async (req, res) => {
  try{
    const Users = await User.find()
    res.json(Users)
  }
  catch (err) {
    res.status(500).json({ message: err.message })
  }
})

//gettingbyusername
router.get('/username/:username', getUserByUsername, (req, res) => {
  res.send(res.user);
});

//gettingbyusername
router.get('/email/:email', getUserByemail, (req, res) => {
  res.send(res.user);
});

//getting by id
router.get('/id/:id', getUserByID, (req, res) => {
  res.send(res.user);
});

router.post('/', async (req, res) => {
  const { username, email, password, birthDate, bio, dailyObj, AccPrivate, ProfileColor } = req.body;

  try {
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username already in use' });
    }

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const newUser = new User({
      username,
      email,
      password,
      birthDate,
      bio,
      dailyObj,
      AccPrivate,
      ProfileColor
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userWithAdditionalInfo = {
      id: user.id || user._id,
      username: user.username,
      email: user.email,
      birthDate: user.birthDate,
      AccDate: user.AccDate,
      guildsJoined: user.guildsJoined,
      guildsOwned: user.guildsOwned,
      parties: user.parties,
      companions: user.companions,
      dailyObj: user.dailyObj,
      bio: user.bio,
      AccPrivate: user.AccPrivate,
      ProfileColor: user.ProfileColor,
      ProfileImg: user.ProfileImg,
      ProfileImgBgColor: user.ProfileImgBgColor,
      CompanionRequest: user.CompanionRequest,
      BlockedTravelers: user.BlockedTravelers,
      messages: user.messages,
      requestedGuilds: user.requestedGuilds,
    };

    res.status(200).json({ user: userWithAdditionalInfo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Updating one
router.patch('/id/:id', getUserByID, async (req, res) => {
  try {
    if (req.body.username != null) {
      const existingUserByUsername = await User.findOne({ username: req.body.username });
      if (existingUserByUsername && existingUserByUsername._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Username already in use' });
      }
      res.user.username = req.body.username;
    }

    if (req.body.password != null) {
      res.user.password = req.body.password;
    }
    if (req.body.bio != null) {
      res.user.bio = req.body.bio;
    }
    if (req.body.dailyObj != null) {
      res.user.dailyObj = req.body.dailyObj;
    }
    if (req.body.companions != null) {
      res.user.companions = req.body.companions;
    }
    if (req.body.parties != null) {
      res.user.parties = req.body.parties;
    }
    if (req.body.guildsJoined != null) {
      res.user.guildsJoined = req.body.guildsJoined;
    }
    if (req.body.AccPrivate != null) {
      res.user.AccPrivate = req.body.AccPrivate;
    }
    if (req.body.ProfileColor != null) {
      res.user.ProfileColor = req.body.ProfileColor;
    }
    if (req.body.ProfileImg != null) {
      res.user.ProfileImg = req.body.ProfileImg; 
    }
    if (req.body.ProfileImgBgColor != null) {
      res.user.ProfileImgBgColor = req.body.ProfileImgBgColor;
    }
    if (req.body.BlockedTravelers != null) {
      res.user.BlockedTravelers = req.body.BlockedTravelers;
    }
    if (req.body.messages != null) {
      res.user.messages = req.body.messages;
    }
    if (req.body.requestedGuilds != null) {
      res.user.requestedGuilds = req.body.requestedGuilds;
    }
    
    const updatedUser = await res.user.save();
    res.json(updatedUser); 
  } catch (err) {
    res.status(400).json({ message: err.message }); 
  }
});

//getting message count
router.post('/messages/count', async (req, res) => {
  const companionId = req.body.companionId;

  try {
    const user = await User.findById(companionId);
    const messageCount = user.messages ? user.messages.length : 0;

    res.json({ count: messageCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//updating companion requests
router.patch('/:userId/companion-request', async (req, res) => {
  const receiverUserId = req.params.userId;
  const senderUserId = req.body.companionId; 

  try {
    const receiverUser = await User.findById(receiverUserId);
    if (!receiverUser) {
      return res.status(404).json({ message: 'Receiver user not found' });
    }

    receiverUser.CompanionRequest.push(senderUserId);
    await receiverUser.save();

    res.json({ message: 'Companion request sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:userId/companions', async (req, res) => {
  const accepterId = req.params.userId;
  const acceptieId = req.body.companionId; 

  try {
    const accepterUser = await User.findById(accepterId);

    if (!accepterUser) {
      return res.status(404).json({ message: 'Accepter user not found' });
    }

    accepterUser.companions.push(acceptieId);

    const acceptieUser = await User.findById(acceptieId);

    if (!acceptieUser) {
      return res.status(404).json({ message: 'Acceptie user not found' });
    }

    acceptieUser.companions.push(accepterId);

    await Promise.all([accepterUser.save(), acceptieUser.save()]);

    res.json({ message: 'Companion request sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//updating companion request with a decline 
router.patch('/:userId/companions/:accepterId', async (req, res) => {
  const acceptieId = req.params.userId;
  const accepterId = req.params.accepterId;

  try {
    const accepterUser = await User.findById(accepterId);
    
    if (!accepterUser) {
      return res.status(404).json({ message: 'Accepter user not found' });
    }

    const acceptieIdString = acceptieId.toString();

    const newCompanionRequest = accepterUser.CompanionRequest.filter(id => id.toString() !== acceptieIdString);

    accepterUser.CompanionRequest = newCompanionRequest;

    await accepterUser.save();

    res.json({ message: 'Companion request declined successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//Removing Companion
router.delete('/:userId/companions/:companionId', async (req, res) => {
  const removerId = req.params.userId;
  const removeeId = req.params.companionId;

  try {
    const removerUser = await User.findById(removerId);

    if (!removerUser) {
      return res.status(404).json({ message: 'Remover user not found' });
    }

    removerUser.companions = removerUser.companions.filter(id => id.toString() !== removeeId);

    await removerUser.save();

    const removeeUser = await User.findById(removeeId);

    if (!removeeUser) {
      return res.status(404).json({ message: 'Removee user not found' });
    }

    removeeUser.companions = removeeUser.companions.filter(id => id.toString() !== removerId);

    await removeeUser.save();

    res.json({ message: 'Companion removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//Updating with Adding Block List
router.patch('/:userId/Block-List', async (req, res) => {
  const userId = req.params.userId;
  const travelerId = req.body.travelerId;

  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.BlockedTravelers.includes(travelerId)) {
      return res.status(400).json({ message: 'Traveler already blocked' });
    }

    user.BlockedTravelers.push(travelerId);

    const updatedUser = await user.save();

    res.status(200).json({ message: 'Traveler blocked successfully', user: updatedUser });
  } catch (error) {
    console.error('Error blocking traveler:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//removing person from block list 
router.patch('/:userId/Unblock-List', async (req, res) => {
  const userId = req.params.userId;
  const travelerId = req.body.travelerId;

  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const index = user.BlockedTravelers.indexOf(travelerId);
    if (index === -1) {
      return res.status(400).json({ message: 'Traveler not found in block list' });
    }

    user.BlockedTravelers.splice(index, 1);

    const updatedUser = await user.save();

    res.status(200).json({ message: 'Traveler unblocked successfully', user: updatedUser });
  } catch (error) {
    console.error('Error unblocking traveler:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//Updating Guild List with a join
router.patch('/:userId/join-guild', async (req, res) => {
  const userId = req.params.userId;
  const GuildId = req.body.GuildId;

  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.guildsJoined.includes(GuildId)) {
      return res.status(400).json({ message: 'Traveler already blocked' });
    }

    user.guildsJoined.push(GuildId);

    const updatedUser = await user.save();

    res.status(200).json({ message: 'guild joined successfully', user: updatedUser });
  } catch (error) {
    console.error('Error joining guild:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//deleting one
router.delete('/id/:id', getUserByID, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// MIDDLE WARE
async function getUserByID(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'Cannot find user' })
    }
    res.user = user
    next()
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

async function getUserByUsername(req, res, next) {
  try {
    const user = await User.findOne({ username: req.params.username })
    if (!user) {
      return res.status(404).json({ message: 'Cannot find user with that Username' })
    }
    res.user = user
    next()
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

async function getUserByemail(req, res, next) {
  try {
    const user = await User.findOne({ email: req.params.email })
    if (!user) {
      return res.status(404).json({ message: 'Cannot find user with that email' })
    }
    res.user = user
    next()
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

module.exports = router