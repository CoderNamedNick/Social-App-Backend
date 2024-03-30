const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  birthDate: { type: String, required: true },
  AccDate: { type: String, default: Date.now },
  // Add more fields as needed
});

// Middleware to convert email to lowercase before saving
userSchema.pre('save', function (next) {
  this.email = this.email.toLowerCase(); // Convert email to lowercase
  next();
});

// Custom validation middleware to check if the username already exists
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