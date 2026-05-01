const router = require('express').Router();
const auth = require('../middleware/auth');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

// Получить список друзей
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username avatar isPremium starred');
    res.json(user.friends || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить входящие заявки
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user.id, status: 'pending' })
      .populate('from', 'username avatar');
    res.json(requests);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Отправить запрос
router.post('/request/:userId', auth, async (req, res) => {
  try {
    const existing = await FriendRequest.findOne({
      from: req.user.id,
      to: req.params.userId,
      status: 'pending',
    });
    if (existing) return res.status(400).json({ error: 'Запрос уже отправлен' });
    await new FriendRequest({ from: req.user.id, to: req.params.userId }).save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Принять запрос
router.put('/accept/:requestId', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request || request.to.toString() !== req.user.id)
      return res.status(403).json({ error: 'Нет доступа' });
    request.status = 'accepted';
    await request.save();
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
    await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Отклонить запрос
router.delete('/decline/:requestId', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request || request.to.toString() !== req.user.id)
      return res.status(403).json({ error: 'Нет доступа' });
    request.status = 'declined';
    await request.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;