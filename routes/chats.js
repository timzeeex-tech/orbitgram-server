const router = require('express').Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');

// Получить чаты текущего пользователя
router.get('/', auth, async (req, res) => {
  const chats = await Chat.find({ participants: req.user.id })
    .populate('participants', 'username avatar isPremium starred')
    .sort({ createdAt: -1 });
  res.json(chats);
});

// Создать чат (поддержка targetUserId для директ-чатов)
router.post('/', auth, async (req, res) => {
  const { type, name, targetUserId } = req.body;
  if (type === 'direct' && targetUserId) {
    // Проверяем, нет ли уже существующего директ-чата между этими пользователями
    const existing = await Chat.findOne({
      type: 'direct',
      participants: { $all: [req.user.id, targetUserId] }
    });
    if (existing) {
      return res.json(existing);
    }
    const chat = await Chat.create({
      type: 'direct',
      participants: [req.user.id, targetUserId],
    });
    return res.json(chat);
  }
  // Для групп/каналов – создаём с создателем
  const chat = await Chat.create({
    type,
    name,
    creator: req.user.id,
    participants: [req.user.id]
  });
  res.json(chat);
});

module.exports = router;