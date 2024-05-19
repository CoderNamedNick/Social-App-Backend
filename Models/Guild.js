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
  RequestToJoin: {type: Boolean, required: true},
  Findable: {type: Boolean, required: true},
  guildJoinRequest: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bannedTravelers: [{
    Traveler: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    Reason: { type: String},
  }],
  guildColor: { type: String},
});


const Guild = mongoose.model('Guild', guildSchema);

module.exports = Guild;