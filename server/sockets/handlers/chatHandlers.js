/**
 * chatHandlers.js — Handles room broadcast messages, private DMs, 
 *                   and global (cross-room) direct messages.
 */
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const Message = require("../../models/Message");
const User = require("../../models/User");
const {
  userSocketMap,
  globalUserSockets,
  roomMessages,
  privateMessages,
  MAX_ROOM_MESSAGES,
  getAllConnectedClients,
} = require("../roomState");

const registerChatHandlers = (io, socket) => {
  const getRoom = (payloadRoomId) => socket.currentRoom || payloadRoomId;

  // ROOM MESSAGE: broadcast to all clients in the room
  socket.on(ACTIONS.SEND_ROOM_MESSAGE, ({ roomId, senderId, senderName, message, timestamp }) => {
    const targetRoom = getRoom(roomId);
    const msg = { senderId, senderName, message, timestamp: timestamp || new Date().toISOString() };

    if (!roomMessages.has(targetRoom)) roomMessages.set(targetRoom, []);
    const msgs = roomMessages.get(targetRoom);
    msgs.push(msg);
    if (msgs.length > MAX_ROOM_MESSAGES) msgs.shift();

    io.to(targetRoom).emit(ACTIONS.RECEIVE_ROOM_MESSAGE, msg);
  });

  // PRIVATE DM (within a room): send to a specific user + echo to sender
  socket.on(ACTIONS.SEND_PRIVATE_MESSAGE, ({ roomId, senderId, senderName, recipientId, message, timestamp }) => {
    const targetRoom = getRoom(roomId);
    const msg = { senderId, senderName, recipientId, message, timestamp: timestamp || new Date().toISOString() };

    const dmKey = [senderId, recipientId].sort().join("__");
    if (!privateMessages.has(dmKey)) privateMessages.set(dmKey, []);
    const dms = privateMessages.get(dmKey);
    dms.push(msg);
    if (dms.length > MAX_ROOM_MESSAGES) dms.shift();

    const clients = getAllConnectedClients(io, targetRoom);
    const recipientClient = clients.find((c) => c.username === recipientId);
    if (recipientClient) {
      io.to(recipientClient.socketId).emit(ACTIONS.RECEIVE_PRIVATE_MESSAGE, msg);
    }
    socket.emit(ACTIONS.RECEIVE_PRIVATE_MESSAGE, msg);
  });

  // GLOBAL DM: cross-room direct message stored in DB
  socket.on(ACTIONS.GLOBAL_SEND_MESSAGE, async ({ recipientId, content }) => {
    try {
      const senderId = socket.user.id;
      if (!senderId || !recipientId) return;

      const recipientDoc = await User.findById(recipientId).select("following");
      let isRequest = true;

      if (recipientDoc && recipientDoc.following.includes(senderId)) {
        isRequest = false;
      } else {
        const existing = await Message.findOne({
          sender: recipientId, receiver: senderId, isRequest: false,
        });
        if (existing) isRequest = false;
      }

      const newMessage = await Message.create({
        sender: senderId,
        receiver: recipientId,
        content,
        isRequest,
        isRead: false,
      });

      const recipientSocketId = globalUserSockets.get(recipientId.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit(ACTIONS.GLOBAL_RECEIVE_MESSAGE, {
          ...newMessage.toObject(),
          senderName: socket.user.username,
        });
      }

      socket.emit(ACTIONS.GLOBAL_RECEIVE_MESSAGE, {
        ...newMessage.toObject(),
        senderName: socket.user.username,
      });
    } catch (err) {
      logger.error(`Error sending global message: ${err.message}`);
    }
  });
};

module.exports = { registerChatHandlers };
