const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
router.post('/upgrade', auth, async (req, res) => {
  const { type } = req.body;
  if (!['premium', 'ultra'].includes(type)) return res.status(400).json({ error: 'Неверный тип' });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Не найден' });
  const now = new Date();
  const currentExpiry = user.subscription?.expiresAt || now;
  const newExpiry = new Date(Math.max(currentExpiry, now) + 30 * 24 * 60 * 60 * 1000);
  user.subscription = { type, expiresAt: newExpiry };
  user.starred = type !== 'starter';
  await user.save();
  res.json({ subscription: user.subscription, starred: user.starred });
});
module.exports = router;