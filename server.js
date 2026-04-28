const userRoutes = require('./routes/users');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const storyRoutes = require('./routes/stories');
const socketHandler = require('./socket/handler');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/users', userRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB подключена');
    const orbitExists = await User.findOne({ username: 'Orbitgram' });
    if (!orbitExists) {
      await new User({
        username: 'Orbitgram',
        passwordHash: 'not_needed',
        isPremium: false,
        starred: false
      }).save();
      console.log('Создан официальный аккаунт Orbitgram');
    }
  })
  .catch(err => console.error('Ошибка MongoDB:', err));

socketHandler(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => console.log(`Сервер запущен на порту ${PORT}`));