/**
 * permissionHandlers.js — Handles role/permission management within a room.
 */
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const { userSocketMap, roomAdmins, roomPermissions } = require("../roomState");

const registerPermissionHandlers = (io, socket) => {
  const getRoom = (payloadRoomId) => socket.currentRoom || payloadRoomId;

  // SET_PERMISSION (generic)
  socket.on(ACTIONS.SET_PERMISSION, ({ roomId, targetUsername, permission }) => {
    const targetRoom = getRoom(roomId);
    const admin = roomAdmins.get(targetRoom);
    if (!admin || admin.socketId !== socket.id) {
      logger.warn(`Non-admin ${userSocketMap[socket.id]} tried to set permission in ${targetRoom}`);
      return;
    }
    if (targetUsername === admin.username) return;
    if (permission !== "editor" && permission !== "viewer") return;
    if (!roomPermissions.has(targetRoom)) roomPermissions.set(targetRoom, new Map());
    roomPermissions.get(targetRoom).set(targetUsername, permission);
    io.to(targetRoom).emit(ACTIONS.PERMISSION_UPDATED, {
      permissions: Object.fromEntries(roomPermissions.get(targetRoom)),
    });
    logger.info(`Admin ${admin.username} set ${targetUsername} to '${permission}' in ${targetRoom}`);
  });

  // PROMOTE_TO_EDITOR
  socket.on(ACTIONS.PROMOTE_TO_EDITOR, ({ roomId, targetUsername }) => {
    const targetRoom = getRoom(roomId);
    const admin = roomAdmins.get(targetRoom);
    if (!admin || admin.socketId !== socket.id) return;
    if (targetUsername === admin.username) return;
    if (!roomPermissions.has(targetRoom)) return;
    roomPermissions.get(targetRoom).set(targetUsername, "editor");
    io.to(targetRoom).emit(ACTIONS.PERMISSION_UPDATED, {
      permissions: Object.fromEntries(roomPermissions.get(targetRoom)),
    });
    io.to(targetRoom).emit(ACTIONS.ROLE_UPDATED, {
      targetUsername,
      newRole: "editor",
      message: `${targetUsername} has been granted editor access`,
    });
    logger.info(`Admin ${admin.username} promoted ${targetUsername} to editor in ${targetRoom}`);
  });

  // DEMOTE_TO_VIEWER
  socket.on(ACTIONS.DEMOTE_TO_VIEWER, ({ roomId, targetUsername }) => {
    const targetRoom = getRoom(roomId);
    const admin = roomAdmins.get(targetRoom);
    if (!admin || admin.socketId !== socket.id) return;
    if (targetUsername === admin.username) return;
    if (!roomPermissions.has(targetRoom)) return;
    roomPermissions.get(targetRoom).set(targetUsername, "viewer");
    io.to(targetRoom).emit(ACTIONS.PERMISSION_UPDATED, {
      permissions: Object.fromEntries(roomPermissions.get(targetRoom)),
    });
    io.to(targetRoom).emit(ACTIONS.ROLE_UPDATED, {
      targetUsername,
      newRole: "viewer",
      message: `${targetUsername}'s editor access has been revoked`,
    });
    logger.info(`Admin ${admin.username} demoted ${targetUsername} to viewer in ${targetRoom}`);
  });
};

module.exports = { registerPermissionHandlers };
