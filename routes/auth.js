const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');

router.post('/signup', async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash: hash, phone });
    await user.save();

    const orbit = await User.findOne({ username: 'Orbitgram' });
    if (orbit) {
      await new Chat({
        type: 'direct',
        participants: [user._id, orbit._id],
        isOfficial: true
      }).save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username, isPremium: true, premiumExpires: user.premiumExpires } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Неверные данные' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: 'Неверные данные' });

  if (user.premiumExpires && new Date() > user.premiumExpires) {
    user.isPremium = false;
    user.starred = false;
    await user.save();
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, username, isPremium: user.isPremium, premiumExpires: user.premiumExpires } });
});

module.exports = router;