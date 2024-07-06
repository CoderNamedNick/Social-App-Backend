const express = require('express');
const router = express.Router();
const Message = require('../Models/Message');
const User = require('../Models/User');

// POST route to create a new message
router.post('/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;

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

    // Save the message 
    await message.save();

    res.status(201).json({ message: 'Message created successfully', data: message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST route to send a message
router.post('/messages/:senderId/send/:receiverId', async (req, res) => {
  try {
    const { content } = req.body;
    const senderId = req.params.senderId;
    const receiverId = req.params.receiverId;

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'Sender or receiver not found' });
    }

    const senderUsername = sender.username;
    const receiverUsername = receiver.username;

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
          senderUsername: senderUsername,
          receiver: receiverId,
          content: content,
        }]
      });
    } else {
      if (!conversation.UserNames.includes(senderUsername)) {
        conversation.UserNames.push(senderUsername);
      }
      if (!conversation.UserNames.includes(receiverUsername)) {
        conversation.UserNames.push(receiverUsername);
      }
      conversation.messages.push({
        sender: senderId,
        senderUsername: senderUsername,
        receiver: receiverId,
        content: content
      });
    }

    await conversation.save();

    res.status(201).json({ message: 'Message sent successfully', data: conversation });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET route to find unread messages for a user
router.get('/messages/unread/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const unreadMessages = await Message.find({
      messengers: userId,
      'messages.read': false
    });

    const unreadCount = unreadMessages.length;

    res.status(200).json({ unreadCount: unreadCount });
  } catch (error) {
    console.error('Error finding unread messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET route to find messages for a user
router.get('/messages/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const messages = [];

    const Convos = await Message.find({
      messengers: userId,
    });

    Convos.forEach(message => {
      message.messages.forEach(msg => {
        const conversation = {
          messageId: message._id,
          sender: msg.sender,
          receiver: msg.receiver,
          content: msg.content,
          timestamp: msg.timestamp,
          read: msg.read
        };
        messages.push(conversation);
      });
    });

    res.status(200).json({ messages: messages });
  } catch (error) {
    console.error('Error finding unread messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET route to find Convos for a user
router.get('/Conversations/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversations = [];

    const Convos = await Message.find({
      messengers: userId,
    });

    Convos.forEach(Convo => {
      const Converstation = {
        messageId: Convo._id || Convo.id,
        messengers: Convo.messengers,
        UserNames: Convo.UserNames,
      };
      conversations.push(Converstation)
    });

    res.status(200).json({ conversations: conversations });
  } catch (error) {
    console.error('Error finding unread messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET route to find a message by its ID
router.get('/messageById/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.status(200).json({ message });
  } catch (error) {
    console.error('Error finding message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET route to find a message by its ID and send only Messages back
router.get('/messagesById/id/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const messages = message.messages

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error finding message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router