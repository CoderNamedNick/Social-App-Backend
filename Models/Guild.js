const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildName: { type: String, required: true, unique: true },
  guildOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guildDate: { type: Date, default: Date.now },
  joinedTravelers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bio: { type: String, required: true },
  guildPost: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
});

guildSchema.pre('save', async function (next) {
  try {
    const existingGuild = await this.constructor.findOne({ guildName: this.guildName });
    if (existingGuild) {
      const error = new Error('Guild already exists');
      next(error);
    } else {
      next();
    }
  } catch (error) {
    next(error);
  }
});

const Guild = mongoose.model('Guild', guildSchema);

module.exports = Guild;