const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  image: String,
  video: String,
  audio: String,
  sticker: String,
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});
// Удалить сообщение (только своё)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Сообщение не найдено' });
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Можно удалять только свои сообщения' });
    }
    await Message.findByIdAndDelete(req.params.messageId);
    // Оповестим участников чата через сокет (если io доступен)
    const io = req.app.get('io');
    if (io) {
      io.to(message.chat.toString()).emit('message_deleted', { messageId: message._id });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = mongoose.model('Message', messageSchema);