const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Настройка транспорта для почты (используем переменные окружения)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post('/signup', async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, passwordHash: hash, phone });
    await user.save();
    const orbit = await User.findOne({ username: 'Orbitgram' });
    if (orbit) {
      await new Chat({ type: 'direct', participants: [user._id, orbit._id], isOfficial: true }).save();
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username, ...user.toObject(), passwordHash: undefined } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Неверные данные' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: 'Неверные данные' });

  if (user.twoFactorEnabled) {
    const code = generateCode();
    user.twoFactorCode = code;
    user.twoFactorExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    // Отправка кода по выбранному методу
    if (user.twoFactorMethod === 'email' && user.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Код для входа в Orbitgram',
          text: `Ваш код: ${code}. Никому не сообщайте его.`,
        });
      } catch (err) {
        console.error('Ошибка отправки почты:', err);
        return res.status(500).json({ error: 'Не удалось отправить код на почту' });
      }
    } else {
      // Отправка в чат Orbitgram (старый способ)
      const orbitUser = await User.findOne({ username: 'Orbitgram' });
      if (orbitUser) {
        const officialChat = await Chat.findOne({ participants: { $all: [user._id, orbitUser._id] } });
        if (officialChat) {
          await Message.create({ chat: officialChat._id, sender: orbitUser._id, text: `Ваш код для входа: ${code}. Никому не сообщайте его.` });
          const io = req.app.get('io');
          io.to(user._id.toString()).emit('new_message', { chatId: officialChat._id, message: { text: `Код: ${code}` } });
        }
      }
    }
    return res.json({ require2FA: true, userId: user._id, message: 'Код отправлен' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, username: user.username, ...user.toObject(), passwordHash: undefined } });
});

router.post('/verify-2fa', async (req, res) => {
  const { userId, code } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(400).json({ error: 'Неверные данные' });
  if (user.twoFactorCode !== code || new Date() > user.twoFactorExpires) {
    return res.status(400).json({ error: 'Неверный или истекший код' });
  }
  user.twoFactorCode = null;
  user.twoFactorExpires = null;
  await user.save();
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, username: user.username, ...user.toObject(), passwordHash: undefined } });
});

module.exports = router;