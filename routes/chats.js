const router = require('express').Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Получить чаты текущего пользователя
router.get('/', auth, async (req, res) => {
  const chats = await Chat.find({ participants: req.user.id })
    .populate('participants', 'username avatar isPremium starred isOnline')
    .sort({ createdAt: -1 });
  res.json(chats);
});

// Создать чат (группа/канал/директ)
router.post('/', auth, async (req, res) => {
  const { type, name, description, targetUserId } = req.body;

  if (type === 'direct' && targetUserId) {
    const existing = await Chat.findOne({
      type: 'direct',
      participants: { $all: [req.user.id, targetUserId] }
    });
    if (existing) return res.json(existing);

    const chat = await Chat.create({
      type: 'direct',
      participants: [req.user.id, targetUserId]
    });
    return res.json(chat);
  }

  if (type === 'group' || type === 'channel') {
    const chat = await Chat.create({
      type,
      name: name || 'Новая группа',
      description: description || '',
      creator: req.user.id,
      admins: [req.user.id],
      participants: [req.user.id]
    });
    return res.json(chat);
  }
  res.status(400).json({ error: 'Неверный тип чата' });
});

// Редактировать группу/канал (только админ)
router.put('/:chatId', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });
  if (!chat.admins.includes(req.user.id)) {
    return res.status(403).json({ error: 'Только админ может редактировать' });
  }
  const { name, description, avatar } = req.body;
  if (name) chat.name = name;
  if (description !== undefined) chat.description = description;
  if (avatar !== undefined) chat.avatar = avatar;
  await chat.save();
  res.json(chat);
});

// Получить участников чата
router.get('/:chatId/members', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId)
    .populate('participants', 'username avatar isPremium starred isOnline')
    .populate('admins', 'username');
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });
  res.json({
    participants: chat.participants,
    admins: chat.admins,
    creator: chat.creator
  });
});

// Добавить участника в группу/канал (только админ)
router.post('/:chatId/members', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });
  if (!chat.admins.includes(req.user.id)) {
    return res.status(403).json({ error: 'Только админ может добавлять участников' });
  }
  const { userId } = req.body;
  if (!chat.participants.includes(userId)) {
    chat.participants.push(userId);
    await chat.save();
  }
  // Вернуть обновлённых участников
  await chat.populate('participants', 'username avatar isPremium starred');
  res.json(chat.participants);
});

// Удалить участника (только админ, нельзя удалить создателя)
router.delete('/:chatId/members/:userId', auth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });
  if (!chat.admins.includes(req.user.id)) {
    return res.status(403).json({ error: 'Только админ может удалять участников' });
  }
  const userId = req.params.userId;
  if (chat.creator.toString() === userId) {
    return res.status(403).json({ error: 'Нельзя удалить создателя группы' });
  }
  chat.participants = chat.participants.filter(p => p.toString() !== userId);
  chat.admins = chat.admins.filter(a => a.toString() !== userId);
  await chat.save();
  res.json({ success: true });
});

module.exports = router;