const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for creating JWT tokens
const User = require('../Models/User');
const Guild = require('../Models/Guild');

//MAKE ROUTES

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
//Creating one
router.post('/', async (req, res) => {
  const newUser = new User({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    birthDate: req.body.birthDate,
    bio: req.body.bio, // Include bio field if provided
    dailyObj: req.body.dailyObj, // Include dailyObj field if provided
    AccPrivate: req.body.AccPrivate,
    ProfileColor: req.body.ProfileColor
  })
  try {
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// POST - User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if the password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, 'your_secret_key_here');

    // Additional user information
    const userWithAdditionalInfo = {
      id: user._id,
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
      CompanionRequest: user.CompanionRequest,
      BlockedTravelers: user.BlockedTravelers,
      // Add more fields as needed
    };

    // Send token and user info in response
    res.status(200).json({ token, user: userWithAdditionalInfo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//Updating one
router.patch('/id/:id', getUserByID, async (req, res) => {
  try {
    if (req.body.username != null) {
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
    if (req.body.BlockedTravelers != null) {
      res.user.BlockedTravelers = req.body.BlockedTravelers;
    }
    
    const updatedUser = await res.user.save();
    res.json(updatedUser); // Sending a JSON response
  } catch (err) {
    res.status(400).json({ message: err.message }); // Sending error message as JSON
  }
});
//updating companion requests
router.patch('/:userId/companion-request', async (req, res) => {
  const receiverUserId = req.params.userId; // Changed to match parameter name
  const senderUserId = req.body.companionId; // Extract companionId from the request body

  try {
    const receiverUser = await User.findById(receiverUserId);
    if (!receiverUser) {
      return res.status(404).json({ message: 'Receiver user not found' });
    }

    // Push the senderUserId (companionId) to the CompanionRequest array of the receiver user
    receiverUser.CompanionRequest.push(senderUserId);
    await receiverUser.save();

    res.json({ message: 'Companion request sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//updating companions with an Accept
router.patch('/:userId/companions', async (req, res) => {
  const accepterId = req.params.userId;
  const acceptieId = req.body.companionId; // Renamed from companionId for clarity

  try {
    // Find the accepter user
    const accepterUser = await User.findById(accepterId);
    
    // Check if the accepter user exists
    if (!accepterUser) {
      return res.status(404).json({ message: 'Accepter user not found' });
    }

    // Push the acceptieId to the Companion array of the accepter user
    accepterUser.companions.push(acceptieId);

    // Find the acceptie user
    const acceptieUser = await User.findById(acceptieId);

    // Check if the acceptie user exists
    if (!acceptieUser) {
      return res.status(404).json({ message: 'Acceptie user not found' });
    }

    // Push the accepterId to the Companion array of the acceptie user
    acceptieUser.companions.push(accepterId);

    // Save changes to both users
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
    // Find the accepter user
    const accepterUser = await User.findById(accepterId);
    
    // Check if the accepter user exists
    if (!accepterUser) {
      return res.status(404).json({ message: 'Accepter user not found' });
    }

    // Convert the acceptieId to string for comparison
    const acceptieIdString = acceptieId.toString();

    // Log the initial CompanionRequest array
    console.log('Initial CompanionRequest array:', accepterUser.CompanionRequest);

    // Create a new array without the acceptieId
    const newCompanionRequest = accepterUser.CompanionRequest.filter(id => id.toString() !== acceptieIdString);

    // Log the new CompanionRequest array
    console.log('New CompanionRequest array:', newCompanionRequest);

    // Update the CompanionRequest array of the accepter user with the new array
    accepterUser.CompanionRequest = newCompanionRequest;

    // Save changes to the accepter user
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
    // Find the remover user
    const removerUser = await User.findById(removerId);

    // Check if the remover user exists
    if (!removerUser) {
      return res.status(404).json({ message: 'Remover user not found' });
    }

    // Remove the removeeId from the Companion array of the remover user
    removerUser.companions = removerUser.companions.filter(id => id.toString() !== removeeId);

    // Save changes to remover user
    await removerUser.save();

    // Find the removee user
    const removeeUser = await User.findById(removeeId);

    // Check if the removee user exists
    if (!removeeUser) {
      return res.status(404).json({ message: 'Removee user not found' });
    }

    // Remove the removerId from the Companion array of the removee user
    removeeUser.companions = removeeUser.companions.filter(id => id.toString() !== removerId);

    // Save changes to removee user
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
    // Fetch the user by userId
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the travelerId is already in the BlockedTravelers array
    if (user.BlockedTravelers.includes(travelerId)) {
      return res.status(400).json({ message: 'Traveler already blocked' });
    }
    
    // Add the travelerId to the BlockedTravelers array
    user.BlockedTravelers.push(travelerId);
    
    // Save the updated user
    const updatedUser = await user.save();
    
    // Send a success response with the updated user data
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
    // Fetch the user by userId
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the travelerId is in the BlockedTravelers array
    const index = user.BlockedTravelers.indexOf(travelerId);
    if (index === -1) {
      return res.status(400).json({ message: 'Traveler not found in block list' });
    }
    
    // Remove the travelerId from the BlockedTravelers array
    user.BlockedTravelers.splice(index, 1);
    
    // Save the updated user
    const updatedUser = await user.save();
    
    // Send a success response with the updated user data
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
    // Fetch the user by userId
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if the travelerId is already in the BlockedTravelers array
    if (user.guildsJoined.includes(GuildId)) {
      return res.status(400).json({ message: 'Traveler already blocked' });
    }
    
    // Add the travelerId to the BlockedTravelers array
    user.guildsJoined.push(GuildId);
    
    // Save the updated user
    const updatedUser = await user.save();
    
    // Send a success response with the updated user data
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