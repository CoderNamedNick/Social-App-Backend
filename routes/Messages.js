const express = require('express');
const router = express.Router();
const Message = require('../Models/Message');
const User = require('../Models/User');

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

    // Send a success response
    res.status(201).json({ message: 'Message created successfully', data: message });
  } catch (error) {
    // Handle any errors
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST route to send a message
router.post('/messages/:senderId/send/:receiverId', async (req, res) => {
  try {
    // Extract sender, receiver, and message content from request body
    const { content } = req.body;
    const senderId = req.params.senderId;
    const receiverId = req.params.receiverId;

    // Check if sender and receiver exist
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'Sender or receiver not found' });
    }

    // Get the usernames of sender and receiver
    const senderUsername = sender.username;
    const receiverUsername = receiver.username;

    // Check if there's an existing conversation between sender and receiver
    let conversation = await Message.findOne({
      messengers: { $all: [senderId, receiverId] },
      UserNames: { $all: [senderUsername, receiverUsername] },
    });

    // If no existing conversation, create a new one
    if (!conversation) {
      conversation = new Message({
        messengers: [senderId, receiverId],
        UserNames: [senderUsername, receiverUsername], // Add usernames
        messages: [{
          sender: senderId,
          receiver: receiverId,
          content: content,
        }]
      });
    } else {
      // Update the usernames if they are not already present
      if (!conversation.UserNames.includes(senderUsername)) {
        conversation.UserNames.push(senderUsername);
      }
      if (!conversation.UserNames.includes(receiverUsername)) {
        conversation.UserNames.push(receiverUsername);
      }

      // Add the new message to the conversation
      conversation.messages.push({
        sender: senderId,
        receiver: receiverId,
        content: content
      });
    }

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

// GET route to find messages for a user
router.get('/messages/:userId', async (req, res) => {
  try {
    // Extract userId from request parameters
    const userId = req.params.userId;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const messages = [];

    // Find unread messages for the user
    const Convos = await Message.find({
      messengers: userId,
    });

    // Iterate over unreadMessages and populate conversations array
    Convos.forEach(message => {
      // Iterate over the messages array within each message document
      message.messages.forEach(msg => {
        // Extract relevant information from the message
        const conversation = {
          messageId: message._id,
          sender: msg.sender,
          receiver: msg.receiver,
          content: msg.content,
          timestamp: msg.timestamp,
          read: msg.read
          // Add other fields you need from the message
        };
        messages.push(conversation);
      });
    });

    // Send the conversations array as a response
    res.status(200).json({ messages: messages });
  } catch (error) {
    // Handle any errors
    console.error('Error finding unread messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET route to find Convos for a user
router.get('/Conversations/:userId', async (req, res) => {
  try {
    // Extract userId from request parameters
    const userId = req.params.userId;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversations = [];

    // Find unread messages for the user
    const Convos = await Message.find({
      messengers: userId,
    });

    // Iterate over unreadMessages and populate conversations array
    Convos.forEach(Convo => {
      const Converstation = {
        messageId: Convo._id || Convo.id,
        messengers: Convo.messengers,
        UserNames: Convo.UserNames,
        // Add other fields you need from the message
      };
      conversations.push(Converstation)
    });

    // Send the conversations array as a response
    res.status(200).json({ conversations: conversations });
  } catch (error) {
    // Handle any errors
    console.error('Error finding unread messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET route to find a message by its ID
router.get('/messageById/:messageId', async (req, res) => {
  try {
    // Extract messageId from request parameters
    const messageId = req.params.messageId;

    // Check if the message exists
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Send the message as a response
    res.status(200).json({ message });
  } catch (error) {
    // Handle any errors
    console.error('Error finding message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET route to find a message by its ID and send only Messages back
router.get('/messagesById/id/:messageId', async (req, res) => {
  try {
    // Extract messageId from request parameters
    const messageId = req.params.messageId;

    // Check if the message exists
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const messages = message.messages

    // Send the message as a response
    res.status(200).json({ messages });
  } catch (error) {
    // Handle any errors
    console.error('Error finding message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router