const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  birthDate: { type: Date, required: true },
  AccDate: { type: Date, default: Date.now },
  guildsOwned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guild' }],
  guildsJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guild' }],
  requestedGuilds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guild' }],
  parties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Party' }],
  companions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dailyObj: { type: String },
  bio: { type: String },
  ProfileColor: { type: String, default: ''},
  ProfileImg: { type: String, default: ''},
  ProfileImgBgColor: { type: String, default: ''},
  AccPrivate: { type: Boolean, default: false },
  CompanionRequest: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  BlockedTravelers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10); // Generate a salt
    const hash = await bcrypt.hash(this.password, salt); // Hash the password
    this.password = hash; // Replace plaintext password with hash
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;