const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messengers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }]
});

// Indexes for optimized queries
messageSchema.index({ 'messengers': 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;