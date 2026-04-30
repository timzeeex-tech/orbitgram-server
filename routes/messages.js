const router = require('express').Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// Получить сообщения чата
router.get('/:chatId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'username avatar isPremium starred')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Реакция на сообщение
router.post('/:messageId/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Сообщение не найдено' });

    const user = await User.findById(req.user.id);
    const maxReactions = user.isPremium ? 3 : 1;

    const userReactions = message.reactions.filter(r => r.user.toString() === req.user.id);
    if (userReactions.length >= maxReactions) {
      message.reactions = message.reactions.filter(r => r.user.toString() !== req.user.id);
    }

    message.reactions.push({ user: req.user.id, emoji, createdAt: new Date() });
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(message.chat.toString()).emit('message_reacted', {
        messageId: message._id,
        reactions: message.reactions,
      });
    }

    res.json(message.reactions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;