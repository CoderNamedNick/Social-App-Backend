const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildName: { type: String, required: true, unique: true },
  guildOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guildMoto: { type: String, required: true },
  guildElders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  guildDate: { type: Date, default: Date.now },
  joinedTravelers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bio: { type: String, required: true },
  guildPost: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GuildPost' }],
  RequestToJoin: { type: Boolean, required: true },
  Findable: { type: Boolean, required: true },
  guildJoinRequest: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bannedTravelers: [{
    TravelerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    TravelerUserName: { type: String },
    Reason: { type: String },
  }],
  guildColor: { type: String },
  guildGuidelines: { type: String },
  Reports: [{
    TravelerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    TravelerUserName: { type: String },
    ReasonForReport: { type: String },
  }],
  Warnings: [{
    TravelerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    TravelerUserName: { type: String },
    ReasonForWarning: { type: String },
  }],
  guildElderMessages: [{
    ElderConvoStarter: { type: String, required: true },
    EldersMessages: [{
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      senderUsername: { type: String, required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    }],
    OwnersMessages: [{
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      senderUsername: { type: String, required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    }]
  }]
});


const Guild = mongoose.model('Guild', guildSchema);

module.exports = Guild;