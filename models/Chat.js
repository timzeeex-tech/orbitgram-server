const mongoose = require('mongoose');
const chatSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'group', 'channel'], required: true },
  name: String,
  description: { type: String, default: '' },
  avatar: { type: String, default: '' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],   // массив админов, первый – создатель
  isOfficial: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Chat', chatSchema);