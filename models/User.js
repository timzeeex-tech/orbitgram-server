const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  phone: String,
  avatar: { type: String, default: '' },
  isPremium: { type: Boolean, default: true },
  premiumExpires: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) },
  starred: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('User', userSchema);