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

    socket.on('join_chat', (chatId) => socket.join(chatId));

    socket.on('read_chat', async ({ chatId, userId }) => {
      try {
        await Message.updateMany(
          { chat: chatId, sender: { $ne: userId }, readBy: { $ne: userId } },
          { $push: { readBy: userId } }
        );
        io.to(chatId).emit('chat_read', { chatId, userId });
      } catch (e) {}
    });

    socket.on('send_message', async (data) => {
      const { chatId, senderId, text, image, video, audio, sticker, replyTo, forwardedFrom } = data;
      try {
        const currentChat = await Chat.findById(chatId);
        if (!currentChat) return;
        // Блокировка
        const receiverId = currentChat.participants.find(p => p.toString() !== senderId);
        if (receiverId) {
          const receiver = await User.findById(receiverId);
          if (receiver && receiver.blockedUsers.includes(senderId)) {
            return socket.emit('error', { message: 'Вы заблокированы' });
          }
        }
        if (currentChat.type === 'channel' && currentChat.creator.toString() !== senderId) {
          return socket.emit('error', { message: 'В канале пишет только создатель' });
        }

        const message = await Message.create({
          chat: chatId, sender: senderId, text: text || null,
          image: image || null, video: video || null, audio: audio || null,
          sticker: sticker || null, replyTo: replyTo || null,
          forwardedFrom: forwardedFrom || null, readBy: [senderId],
        });
        await message.populate('sender', 'username avatar isPremium starred isOnline');
        await message.populate('replyTo');
        await message.populate('forwardedFrom');

        io.to(chatId).emit('new_message', message);

        // Первое сообщение -> уведомить о новом чате
        if (await Message.countDocuments({ chat: chatId }) === 1) {
          io.to(currentChat.participants.map(p => p.toString())).emit('new_chat', currentChat);
        }

        for (const pId of currentChat.participants) {
          if (pId.toString() !== senderId) {
            io.to(pId.toString()).emit('new_message_notification', { chatId, message });
          }
        }
      } catch (err) { console.error('send_message error:', err); }
    });

    socket.on('typing', ({ chatId, userId, isTyping }) => socket.to(chatId).emit('user_typing', { userId, isTyping }));

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