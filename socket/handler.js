const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 Подключился:', socket.id);

    socket.on('register', async (userId) => {
      if (!userId) return;
      socket.userId = userId;
      socket.join(userId);

      const currentUser = await User.findById(userId);
      if (currentUser && currentUser.showOnline !== false) {
        await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
        io.emit('user_online', { userId, isOnline: true, lastSeen: new Date() });
      }
    });

    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`${socket.id} в комнате ${chatId}`);
    });

    socket.on('send_message', async (data) => {
      const { chatId, senderId, text, image, video, audio, sticker } = data;
      try {
        const currentChat = await Chat.findById(chatId);
        if (!currentChat) return;
        const msg = await Message.create({
  chat: chatId,
  sender: senderId,
  text,
  image: image || null,
  video: video || null,
  audio: audio || null,
  sticker: sticker || null,
  replyTo: data.replyTo || null,
  edited: false,
});
const populatedMsg = await msg.populate('sender', 'username avatar isPremium starred lastSeen isOnline');
await populatedMsg.populate('replyTo');

        // Проверка блокировки
        const receiverId = currentChat.participants.find(p => p.toString() !== senderId);
        if (receiverId) {
          const receiver = await User.findById(receiverId);
          if (receiver && receiver.blockedUsers.includes(senderId)) {
            return socket.emit('error', { message: 'Вы заблокированы этим пользователем' });
          }
        }

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

        // Если это первое сообщение в чате — уведомим о новом чате
        const msgCount = await Message.countDocuments({ chat: chatId });
        if (msgCount === 1) {
          io.to(currentChat.participants.map(p => p.toString())).emit('new_chat', {
            ...currentChat.toObject(),
            participants: currentChat.participants,
          });
        }

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

    socket.on('typing', ({ chatId, userId, isTyping }) => {
      socket.to(chatId).emit('user_typing', { userId, isTyping });
    });

    socket.on('new_chat_created', (chat) => {
      chat.participants.forEach(pId => {
        io.to(pId.toString()).emit('new_chat', chat);
      });
    });

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