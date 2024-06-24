const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  partyname: {type: String },
  messengers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  UserNames: [{type: String, required: true }],
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderUsername: {type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }]
});


const Party = mongoose.model('Party', partySchema);

module.exports = Party;