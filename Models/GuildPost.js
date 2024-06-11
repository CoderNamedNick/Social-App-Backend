const mongoose = require('mongoose');

const guildpostSchema = new Schema({
  Guild: { type: Schema.Types.ObjectId, ref: 'Guild', required: true },
  post: [{
    Poster: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    PosterUserName: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    Likes: { type: Number, default: 0 },
    Dislikes: { type: Number, default: 0 },
    comments: [{
      commentingUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      commentingUserName: { type: String, required: true },
      commentPost: {
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        Likes: { type: Number, default: 0 },
        Dislikes: { type: Number, default: 0 },
      }
    }]
  }],
  Alerts: [{
    Poster: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    PosterUserName: { type: String, required: true },
    content: { type: String, required: true },
    photo: { type: String }, // URL or reference to the photo
    timestamp: { type: Date, default: Date.now },
    Likes: { type: Number, default: 0 },
    Dislikes: { type: Number, default: 0 },
  }],
});

// Indexes for optimized queries
guildpostSchema.index({ 'guildpost': 1 });

const GuildPost = mongoose.model('GuildPost', guildpostSchema);

module.exports = GuildPost;