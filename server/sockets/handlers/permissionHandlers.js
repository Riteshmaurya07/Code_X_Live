/**
 * permissionHandlers.js — Handles role/permission management within a room.
 */
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const { userSocketMap, roomAdmins, roomPermissions } = require("../roomState");

const registerPermissionHandlers = (io, socket) => {

  // SET_PERMISSION (generic)
  socket.on(ACTIONS.SET_PERMISSION, ({ roomId, targetUsername, permission }) => {
    const admin = roomAdmins.get(roomId);
    if (!admin || admin.socketId !== socket.id) {
      logger.warn(`Non-admin ${userSocketMap[socket.id]} tried to set permission in ${roomId}`);
      return;
    }
    if (targetUsername === admin.username) return;
    if (permission !== "editor" && permission !== "viewer") return;
    if (!roomPermissions.has(roomId)) roomPermissions.set(roomId, new Map());
    roomPermissions.get(roomId).set(targetUsername, permission);
    io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
      permissions: Object.fromEntries(roomPermissions.get(roomId)),
    });
    logger.info(`Admin ${admin.username} set ${targetUsername} to '${permission}' in ${roomId}`);
  });

  // PROMOTE_TO_EDITOR
  socket.on(ACTIONS.PROMOTE_TO_EDITOR, ({ roomId, targetUsername }) => {
    const admin = roomAdmins.get(roomId);
    if (!admin || admin.socketId !== socket.id) return;
    if (targetUsername === admin.username) return;
    if (!roomPermissions.has(roomId)) return;
    roomPermissions.get(roomId).set(targetUsername, "editor");
    io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
      permissions: Object.fromEntries(roomPermissions.get(roomId)),
    });
    io.to(roomId).emit(ACTIONS.ROLE_UPDATED, {
      targetUsername,
      newRole: "editor",
      message: `${targetUsername} has been granted editor access`,
    });
    logger.info(`Admin ${admin.username} promoted ${targetUsername} to editor in ${roomId}`);
  });

  // DEMOTE_TO_VIEWER
  socket.on(ACTIONS.DEMOTE_TO_VIEWER, ({ roomId, targetUsername }) => {
    const admin = roomAdmins.get(roomId);
    if (!admin || admin.socketId !== socket.id) return;
    if (targetUsername === admin.username) return;
    if (!roomPermissions.has(roomId)) return;
    roomPermissions.get(roomId).set(targetUsername, "viewer");
    io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
      permissions: Object.fromEntries(roomPermissions.get(roomId)),
    });
    io.to(roomId).emit(ACTIONS.ROLE_UPDATED, {
      targetUsername,
      newRole: "viewer",
      message: `${targetUsername}'s editor access has been revoked`,
    });
    logger.info(`Admin ${admin.username} demoted ${targetUsername} to viewer in ${roomId}`);
  });

  // PERMISSION_DENIED is emitted by the server, not registered here
};

module.exports = { registerPermissionHandlers };
