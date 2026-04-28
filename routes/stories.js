const router = require('express').Router();
const auth = require('../middleware/auth');
const Story = require('../models/Story');
const User = require('../models/User');

router.get('/', auth, async (req, res) => {
  const now = new Date();
  const stories = await Story.find({ expiresAt: { $gt: now } })
    .populate('author', 'username avatar isPremium starred');
  res.json(stories);
});

router.post('/', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user.isPremium) return res.status(403).json({ error: 'Только Premium могут создавать истории' });
  const { mediaUrl } = req.body;
  const story = await Story.create({ author: req.user.id, mediaUrl });
  res.json(story);
});

module.exports = router;