const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  birthDate: { type: Date, required: true },
  AccDate: { type: Date, default: Date.now },
  guildsJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guild' }],
  parties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Party' }],
  travelers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Traveler' }],
  dailyObj: { type: String },
  bio: { type: String },
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