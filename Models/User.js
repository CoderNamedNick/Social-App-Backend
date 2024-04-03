const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  birthDate: { type: String, required: true },
  AccDate: { type: String, default: Date.now },
  guildsJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guild' }],
  parties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Party' }],
  travelers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Traveler' }],
  dailyObjs: [{ type: String, ref: 'DailyObj' }],
  bios: [{ type: String, ref: 'Bio' }],
 // classes: [{ type: String, ref: 'Class' }] <= Maybe 
});

userSchema.pre('save', function (next) {
  this.email = this.email.toLowerCase();
  next();
});

userSchema.pre('save', async function (next) {
  try {
    const existingUser = await this.constructor.findOne({ username: this.username });
    if (existingUser) {
      const error = new Error('Username already exists');
      next(error);
    } else {
      next();
    }
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;