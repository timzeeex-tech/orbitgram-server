const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Поиск пользователей
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length === 0) return res.json([]);
    const regex = new RegExp(query.trim(), 'i');
    const users = await User.find({
      _id: { $ne: req.user.id },
      username: { $regex: regex }
    })
    .select('username avatar isPremium starred bio status coverColor createdAt')
    .limit(20);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновление профиля
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar, bio, status, coverColor } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    if (username && username !== user.username) {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ error: 'Имя занято' });
      user.username = username;
    }
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;
    if (status !== undefined) user.status = status;
    if (coverColor !== undefined) user.coverColor = coverColor;

    await user.save();
    res.json({
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      status: user.status,
      coverColor: user.coverColor,
      isPremium: user.isPremium,
      starred: user.starred,
      premiumExpires: user.premiumExpires,
      createdAt: user.createdAt
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Сохранить настройки
router.put('/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    user.settings = { ...user.settings, ...settings };
    await user.save();
    res.json({ settings: user.settings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить профиль любого пользователя по ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username avatar bio status coverColor isPremium starred createdAt');
    if (!user) return res.status(404).json({ error: 'Не найден' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
// Заблокировать пользователя
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Не найден' });
    if (!user.blockedUsers) user.blockedUsers = [];
    if (!user.blockedUsers.includes(req.params.userId)) {
      user.blockedUsers.push(req.params.userId);
      await user.save();
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Разблокировать
router.delete('/block/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Не найден' });
    user.blockedUsers = (user.blockedUsers || []).filter(id => id.toString() !== req.params.userId);
    await user.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]