/**
 * permissionHandlers.js — Handles role/permission management within a room.
 */
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const { userSocketMap, roomAdmins, roomPermissions } = require("../roomState");
const User = require("../../models/User");
const Project = require("../../models/Project");

const registerPermissionHandlers = (io, socket) => {
  const getRoom = (payloadRoomId) => socket.currentRoom || payloadRoomId;

  // Helper to persist permission to DB
  const persistPermissionToDb = async (roomId, targetUsername, newRole) => {
    try {
      const targetUser = await User.findOne({ username: targetUsername });
      if (!targetUser) return;

      const targetRoom = getRoom(roomId);
      let project = await Project.findById(targetRoom);
      if (!project) project = await Project.findOne({ roomId: targetRoom });
      if (!project) project = await Project.findOne({ shareToken: targetRoom });

      if (project) {
        const collabIndex = project.collaborators.findIndex(
          (c) => c.user && c.user.toString() === targetUser._id.toString()
        );
        if (collabIndex !== -1) {
          project.collaborators[collabIndex].role = newRole;
          await project.save();
          logger.info(`Persisted user ${targetUsername} role change to '${newRole}' in DB for project ${project.name}`);
        }
      }
    } catch (err) {
      logger.error(`Error persisting collaborator role change to DB: ${err.message}`);
    }
  };

  // SET_PERMISSION (generic)
  socket.on(ACTIONS.SET_PERMISSION, async ({ roomId, targetUsername, permission }) => {
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

    await persistPermissionToDb(roomId, targetUsername, permission);
  });

  // PROMOTE_TO_EDITOR
  socket.on(ACTIONS.PROMOTE_TO_EDITOR, async ({ roomId, targetUsername }) => {
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

    await persistPermissionToDb(roomId, targetUsername, "editor");
  });

  // DEMOTE_TO_VIEWER
  socket.on(ACTIONS.DEMOTE_TO_VIEWER, async ({ roomId, targetUsername }) => {
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

    await persistPermissionToDb(roomId, targetUsername, "viewer");
  });
};

module.exports = { registerPermissionHandlers };
