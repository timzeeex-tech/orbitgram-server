const router = require('express').Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

router.get('/weekly', auth, async (req, res) => {
  try {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const count = await Message.countDocuments({ sender: req.user.id, createdAt: { $gte: lastWeek } });
    res.json({ week: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;