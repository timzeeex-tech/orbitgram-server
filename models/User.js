const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  phone: String,
  avatar: { type: String, default: '' },
  isPremium: { type: Boolean, default: true },
  premiumExpires: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) },
  starred: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  pushToken: { type: String, default: null },
  settings: {
    theme: { type: String, default: 'dark' },
    fontSize: { type: Number, default: 14 },
    vibration: { type: Boolean, default: true },
    sound: { type: Boolean, default: true }
  }
});
module.exports = mongoose.model('User', userSchema);