const router = require('express').Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

router.get('/:chatId', auth, async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate('sender', 'username avatar isPremium starred')
    .sort({ createdAt: 1 });
  res.json(messages);
});

router.post('/:messageId/react', auth, async (req, res) => {
  const { emoji } = req.body;
  const userId = req.user.id;
  const message = await Message.findById(req.params.messageId);
  if (!message) return res.status(404).json({ error: 'Сообщение не найдено' });

  const user = await User.findById(userId);
  const maxReactions = user.isPremium ? 3 : 1;

  const userReactions = message.reactions.filter(r => r.user.toString() === userId);
  if (userReactions.length >= maxReactions) {
    return res.status(403).json({ error: `Только Premium может ставить до ${maxReactions} реакций` });
  }

  message.reactions.push({ user: userId, emoji });
  await message.save();

  const io = req.app.get('io');
  io.to(message.chat.toString()).emit('message_reacted', {
    messageId: message._id,
    reactions: message.reactions
  });

  res.json(message.reactions);
});

module.exports = router;
const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  image: String,
  video: String,
  audio: String,
  sticker: String,
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Message', messageSchema);