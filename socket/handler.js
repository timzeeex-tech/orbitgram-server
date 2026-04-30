const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 Подключился:', socket.id);

    // Регистрация пользователя в сокете
    socket.on('register', async (userId) => {
      if (!userId) return;
      socket.userId = userId;
      socket.join(userId);

      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      io.emit('user_online', { userId, isOnline: true, lastSeen: new Date() });
    });

    // Присоединение к комнате чата
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`${socket.id} в комнате ${chatId}`);
    });

    // Отправка сообщения
socket.on('send_message', async (data) => {
  const { chatId, senderId, text, image, video, audio, sticker } = data;
  try {
    const currentChat = await Chat.findById(chatId);
    if (!currentChat) return;

    if (currentChat.type === 'channel' && currentChat.creator.toString() !== senderId) {
      return socket.emit('error', { message: 'В канале могут писать только создатели' });
    }

    const msg = await Message.create({
      chat: chatId,
      sender: senderId,
      text,
      image: image || null,
      video: video || null,
      audio: audio || null,
      sticker: sticker || null
    });
    const populatedMsg = await msg.populate('sender', 'username avatar isPremium starred lastSeen isOnline');

    io.to(chatId).emit('new_message', populatedMsg);

    currentChat.participants.forEach(async (pId) => {
      if (pId.toString() !== senderId) {
        io.to(pId.toString()).emit('new_message_notification', {
          chatId,
          message: populatedMsg
        });
      }
    });
  } catch (err) {
    console.error('send_message error:', err);
  }
      const { chatId, senderId, text, image } = data;
      try {
        const currentChat = await Chat.findById(chatId);
        if (!currentChat) return;

        // В канале писать может только создатель
        if (currentChat.type === 'channel' && currentChat.creator.toString() !== senderId) {
          return socket.emit('error', { message: 'В канале могут писать только создатели' });
        }

        const msg = await Message.create({ chat: chatId, sender: senderId, text, image: image || null });
        const populatedMsg = await msg.populate('sender', 'username avatar isPremium starred lastSeen isOnline');

        io.to(chatId).emit('new_message', populatedMsg);

        // Уведомления участникам
        currentChat.participants.forEach(async (pId) => {
          if (pId.toString() !== senderId) {
            io.to(pId.toString()).emit('new_message_notification', {
              chatId,
              message: populatedMsg
            });
          }
        });
      } catch (err) {
        console.error('Ошибка отправки сообщения:', err);
      }
    });

    // Индикатор печати
    socket.on('typing', ({ chatId, userId, isTyping }) => {
      socket.to(chatId).emit('user_typing', { userId, isTyping });
    });

    // Отключение
    socket.on('disconnect', async () => {
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
        io.emit('user_online', { userId: socket.userId, isOnline: false, lastSeen: new Date() });
      }
      console.log('🔴 Отключился:', socket.id);
    });
  });
};