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
//Getting One
router.get('/:id', (req, res) => {
  res.send(req.params.id)
})
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
router.patch('/:id', (req, res) => {
  
})
//deleting one
router.delete('/:id', (req, res) => {
  
})







module.exports = router