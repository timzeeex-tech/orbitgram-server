const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 Подключился:', socket.id);
    // Уведомление о новом чате (когда кто-то написал первый раз)
socket.on('new_chat_created', (chat) => {
  chat.participants.forEach(pId => {
    if (pId.toString() !== socket.userId) {
      io.to(pId.toString()).emit('new_chat', chat);
    }
  });
});

    // Регистрация пользователя в сокете
    socket.on('register', async (userId) => {
      if (!userId) return;
      socket.userId = userId;
      socket.join(userId); // персональная комната для уведомлений

      const currentUser = await User.findById(userId);
      if (currentUser && currentUser.showOnline !== false) {
        await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
        io.emit('user_online', { userId, isOnline: true, lastSeen: new Date() });
      }
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
        // Внутри send_message после создания сообщения:
const msgCount = await Message.countDocuments({ chat: chatId });
if (msgCount === 1) {
  // это первое сообщение — уведомим получателя о новом чате
  socket.emit('new_chat_created', currentChat);
}

        // В канале писать может только создатель
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
          sticker: sticker || null,
        });
        const populatedMsg = await msg.populate('sender', 'username avatar isPremium starred lastSeen isOnline');

        io.to(chatId).emit('new_message', populatedMsg);

        // Уведомления участникам
        currentChat.participants.forEach(async (pId) => {
          if (pId.toString() !== senderId) {
            io.to(pId.toString()).emit('new_message_notification', {
              chatId,
              message: populatedMsg,
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
        const currentUser = await User.findById(socket.userId);
        if (currentUser && currentUser.showOnline !== false) {
          await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
          io.emit('user_online', { userId: socket.userId, isOnline: false, lastSeen: new Date() });
        }
      }
      console.log('🔴 Отключился:', socket.id);
    });
  });
};