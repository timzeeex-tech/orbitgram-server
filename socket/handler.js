const Message = require('../models/Message');
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 Пользователь подключился:', socket.id);

    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`Пользователь ${socket.id} в комнате ${chatId}`);
    });

    socket.on('send_message', async (data) => {
      const { chatId, senderId, text } = data;
      const msg = await Message.create({ chat: chatId, sender: senderId, text, image: data.image || null });
      const populatedMsg = await msg.populate('sender', 'username avatar isPremium starred');
      io.to(chatId).emit('new_message', populatedMsg);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Пользователь отключился:', socket.id);
    });
  });
};