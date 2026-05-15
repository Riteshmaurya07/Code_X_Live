/**
 * disconnectHandlers.js — Handles socket disconnection: cleanup, admin promotion,
 *                          room teardown, and cursor removal.
 */
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const {
  userSocketMap,
  globalUserSockets,
  roomAdmins,
  roomBanList,
  roomApprovedJoiners,
  roomState,
  roomPermissions,
  roomInviteTokens,
  roomCleanupTimers,
  roomMessages,
  cursorPositions,
  cursorThrottle,
  CURSOR_THROTTLE_MS,
  activeCallRooms,
  getAllConnectedClients,
} = require("../roomState");

const registerDisconnectHandlers = (io, socket) => {

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    const username = userSocketMap[socket.id];

    rooms.forEach((roomId) => {
      // Notify room members
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username,
      });

      // Remove cursor widget from other clients
      socket.in(roomId).emit("cursor-remove", { socketId: socket.id });

      // Clean up cursor store
      if (cursorPositions[roomId]) {
        delete cursorPositions[roomId][socket.id];
      }

      // Clean up active calls
      const callParticipants = activeCallRooms.get(roomId);
      if (callParticipants && callParticipants.has(socket.id)) {
        callParticipants.delete(socket.id);
        socket.to(roomId).emit(ACTIONS.PARTICIPANT_LEFT_CALL, {
          socketId: socket.id,
          username,
        });
        if (callParticipants.size === 0) {
          activeCallRooms.delete(roomId);
        }
      }

      // Admin promotion if admin disconnects
      const admin = roomAdmins.get(roomId);
      if (admin && admin.socketId === socket.id) {
        const remainingClients = getAllConnectedClients(io, roomId).filter(
          (c) => c.socketId !== socket.id
        );
        if (remainingClients.length > 0) {
          const newAdmin = remainingClients[0];
          roomAdmins.set(roomId, { socketId: newAdmin.socketId, username: newAdmin.username });
          remainingClients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.ROOM_UPDATE, {
              clients: remainingClients,
              newAdmin: newAdmin.username,
            });
          });
          logger.info(`Admin promoted: ${newAdmin.username} in room ${roomId}`);
        }
      }

      // Schedule room teardown if last user left
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      if (!roomSockets || roomSockets.size <= 1) {
        const timeout = setTimeout(() => {
          const current = io.sockets.adapter.rooms.get(roomId);
          if (!current || current.size === 0) {
            roomState.delete(roomId);
            roomPermissions.delete(roomId);
            roomAdmins.delete(roomId);
            roomBanList.delete(roomId);
            roomApprovedJoiners.delete(roomId);
            roomMessages.delete(roomId);
            roomInviteTokens.delete(roomId);
            roomCleanupTimers.delete(roomId);
            delete cursorPositions[roomId];
            logger.info(`Room ${roomId} cleaned up after grace period`);
          }
        }, 10000); // 10s grace period
        roomCleanupTimers.set(roomId, timeout);
      }
    });

    delete userSocketMap[socket.id];
    delete cursorThrottle[socket.id];
    if (username) logger.info(`${username} disconnected (${socket.id})`);

    // Remove global socket registration
    if (socket.user?.id) {
      const uid = socket.user.id.toString();
      if (globalUserSockets.get(uid) === socket.id) {
        globalUserSockets.delete(uid);
      }
    }
  });
};

module.exports = { registerDisconnectHandlers };
