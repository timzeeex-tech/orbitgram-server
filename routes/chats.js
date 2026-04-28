const router = require('express').Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');

router.get('/', auth, async (req, res) => {
  const chats = await Chat.find({ participants: req.user.id })
    .populate('participants', 'username avatar isPremium starred')
    .sort({ createdAt: -1 });
  res.json(chats);
});

router.post('/', auth, async (req, res) => {
  const { type, name } = req.body;
  const chat = await Chat.create({
    type,
    name,
    creator: req.user.id,
    participants: [req.user.id]
  });
  res.json(chat);
});

module.exports = router;