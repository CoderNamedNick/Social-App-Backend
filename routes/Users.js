const express = require('express')
const router = express.Router()
const User = require('../Models/User')

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
//getting by id
router.get('/id/:id', getUserByID, (req, res) => {
  res.send(res.user.username);
});
//Creating one
router.post('/', async (req, res) => {
  const newUser = new User({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    birthDate: req.body.birthDate,
  })
  try {
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
//Updating one
router.patch('/id/:id', getUserByID, async (req, res) => {
  if (req.body.username != null) {
    res.user.username = req.body.username
  }
  if (req.body.password != null) {
    res.user.password = req.body.password
  }
  try{
    const updatedUser = await res.user.save()
    res.json(updatedUser)
  }
  catch (err){
    res.status(400).json({ message: err.message });
  }
})
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
      return res.status(404).json({ message: 'Cannot find user' })
    }
    res.user = user
    next()
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}




module.exports = router