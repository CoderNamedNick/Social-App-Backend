const express = require('express');
const router = express.Router();
const Message = require('../Models/Message');
const User = require('../Models/User');
const messageEmitter = require('../Emitters/messageEmitter');

// POST route to create a new message
router.post('/messages', async (req, res) => {
  try {
    // Extract sender, receiver, and message content from request body
    const { senderId, receiverId, content } = req.body;

    // Check if sender and receiver exist
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'Sender or receiver not found' });
    }

    // Create a new message
    const message = new Message({
      messengers: [senderId, receiverId],
      messages: [{
        sender: senderId,
        receiver: receiverId,
        content: content
      }]
    });

    // Save the message to the database
    await message.save();

    // Emit an event for the new message with the receiver's user ID
    messageEmitter.emit('newMessage', receiverId);

    // Send a success response
    res.status(201).json({ message: 'Message created successfully', data: message });
  } catch (error) {
    // Handle any errors
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST route to send a message
router.post('/messages/send', async (req, res) => {
  try {
    // Extract sender, receiver, and message content from request body
    const { senderId, receiverId, content } = req.body;

    // Check if sender and receiver exist
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'Sender or receiver not found' });
    }

    // Check if there's an existing conversation between sender and receiver
    let conversation = await Message.findOne({
      messengers: { $all: [senderId, receiverId] }
    });

    // If no existing conversation, create a new one
    if (!conversation) {
      conversation = new Message({
        messengers: [senderId, receiverId],
        messages: []
      });
    }

    // Add the new message to the conversation
    conversation.messages.push({
      sender: senderId,
      receiver: receiverId,
      content: content
    });

    // Save the conversation to the database
    await conversation.save();


    // Send a success response
    res.status(201).json({ message: 'Message sent successfully', data: conversation });
  } catch (error) {
    // Handle any errors
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET route to find unread messages for a user
router.get('/messages/unread/:userId', async (req, res) => {
  try {
    // Extract userId from request parameters
    const userId = req.params.userId;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find unread messages for the user
    const unreadMessages = await Message.find({
      messengers: userId,
      'messages.read': false
    });

    // Count the number of unread messages
    const unreadCount = unreadMessages.length;

    // Send the number of unread messages as a response
    res.status(200).json({ unreadCount: unreadCount });
  } catch (error) {
    // Handle any errors
    console.error('Error finding unread messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router