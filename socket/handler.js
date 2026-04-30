const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 Подключился:', socket.id);

    // Сохраняем ID юзера при подключении
    socket.on('register', async (userId) => {
      if (!userId) return;
      socket.userId = userId;
      socket.join(userId); // персональная комната для уведомлений

      // Обновляем онлайн-статус
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
      const { chatId, senderId, text, image } = data;
      const msg = await Message.create({ chat: chatId, sender: senderId, text, image: image || null });
      const populatedMsg = await msg.populate('sender', 'username avatar isPremium starred lastSeen isOnline');

      io.to(chatId).emit('new_message', populatedMsg);

      // Отправляем уведомление получателю
      const chat = await Chat.findById(chatId);
      if (chat) {
        const receiverIds = chat.participants.filter(p => p.toString() !== senderId);
        receiverIds.forEach(async (receiverId) => {
          const user = await User.findById(receiverId);
          if (user && user.pushToken) {
            // Отправляем пуш через Expo Push API (заглушка, для реальной работы нужен Expo access token)
            // Но мы сделаем через сокет-уведомление, которое клиент сам обернёт в локальное уведомление.
          }
          // Отправляем сокет-событие "new_message_notification" в комнату получателя
          io.to(receiverId).emit('new_message_notification', {
            chatId,
            message: populatedMsg
          });
        });
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