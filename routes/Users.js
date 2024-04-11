const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for creating JWT tokens
const User = require('../Models/User');

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
      parties: user.parties,
      travelers: user.travelers,
      dailyObj: user.dailyObj,
      bio: user.bio,
      AccPrivate: user.AccPrivate,
      ProfileColor: user.ProfileColor,
      CompanionRequest: user.CompanionRequest,
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
    if (req.body.travelers != null) {
      res.user.travelers = req.body.travelers;
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