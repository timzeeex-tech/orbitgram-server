const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Поиск пользователей по юзернейму (исключая себя)
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }
    const regex = new RegExp(query.trim(), 'i');
    const users = await User.find({
      _id: { $ne: req.user.id },
      username: { $regex: regex }
    })
    .select('username avatar isPremium starred')
    .limit(20);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновление профиля (юзернейм и аватар)
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    if (username && username !== user.username) {
      const exists = await User.findOne({ username });
      if (exists) {
        return res.status(400).json({ error: 'Имя занято' });
      }
      user.username = username;
    }
    if (avatar !== undefined) {
      user.avatar = avatar;
    }
    await user.save();
    res.json({
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      isPremium: user.isPremium,
      starred: user.starred,
      premiumExpires: user.premiumExpires
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
// Сохранить настройки пользователя
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