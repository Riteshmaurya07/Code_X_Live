/**
 * roomHandlers.js — Handles room lifecycle: create, join, kick, ban, rejoin approvals.
 */
const crypto = require("crypto");
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const Project = require("../../models/Project");
const {
  userSocketMap,
  roomBanList,
  roomAdmins,
  roomApprovedJoiners,
  roomState,
  roomPermissions,
  roomInviteTokens,
  roomCleanupTimers,
  roomMessages,
  cursorPositions,
  getAllConnectedClients,
} = require("../roomState");

const registerRoomHandlers = (io, socket) => {

  // Register user globally on connect
  socket.on("REGISTER_USER", (userId) => {
    const { globalUserSockets } = require("../roomState");
    if (userId) {
      globalUserSockets.set(userId.toString(), socket.id);
      logger.info(`User ${socket.user?.username} (${userId}) registered globally`);
    }
  });

  // CREATE_ROOM
  socket.on(ACTIONS.CREATE_ROOM, async ({ roomId }) => {
    if (roomCleanupTimers.has(roomId)) {
      clearTimeout(roomCleanupTimers.get(roomId));
      roomCleanupTimers.delete(roomId);
    }

    // Ensure a persistent Project document exists for this room
    try {
      const existing = await Project.findOne({ roomId });
      if (!existing) {
        await Project.create({
          name: "Collaborative Session",
          roomId: roomId,
          owner: socket.user.id,
          language: "nodejs",
          isPublic: true
        });
        logger.info(`Created persistent project document for room ${roomId}`);
      }
    } catch (err) {
      logger.error(`Error creating project for room ${roomId}: ${err.message}`);
    }

    const username = socket.user.username;
    const inviteToken = crypto.randomBytes(6).toString("hex");
    roomInviteTokens.set(roomId, inviteToken);
    roomAdmins.set(roomId, { socketId: socket.id, username });
    socket.emit(ACTIONS.ROOM_CREATED, { roomId, inviteToken });
    logger.info(`Room ${roomId} created by ${username} with invite token ${inviteToken}`);
  });

  // JOIN
  socket.on(ACTIONS.JOIN, async ({ roomId, inviteToken: payloadToken }) => {
    const username = socket.user.username;
    const handshakeToken = socket.handshake.auth?.inviteToken;
    const inviteToken = payloadToken || handshakeToken;
    const cleanRoomId = typeof roomId === "string" ? roomId.trim() : roomId;

    let existingAdmin = roomAdmins.get(cleanRoomId);
    let isRoomCreator = existingAdmin && existingAdmin.username === username;
    let isDbCollaborator = false;

    if (!isRoomCreator) {
      try {
        let project;
        if (typeof cleanRoomId === "string" && cleanRoomId.match(/^[0-9a-fA-F]{24}$/)) {
          project = await Project.findById(cleanRoomId);
        }
        if (!project) project = await Project.findOne({ roomId: cleanRoomId });
        if (!project) project = await Project.findOne({ shareToken: cleanRoomId });

        if (project) {
          const userId = socket.user.id.toString();
          if (project.owner.toString() === userId) {
            isRoomCreator = true;
            isDbCollaborator = true;
            roomAdmins.set(cleanRoomId, { socketId: socket.id, username });
            existingAdmin = { socketId: socket.id, username };
            logger.info(`Owner ${username} reclaimed admin in room ${cleanRoomId}`);
          } else {
            const isCollab = project.collaborators.some(
              (c) => c.user && c.user.toString() === userId
            );
            if (isCollab) {
              isDbCollaborator = true;
              logger.info(`Collaborator ${username} identified for room ${cleanRoomId}`);
            }
          }
        } else {
          logger.debug(`No project found for roomId: ${cleanRoomId}`);
        }
      } catch (err) {
        logger.error(`Failed to fetch project ${cleanRoomId} on join: ${err.message}`);
      }
    }

    const approvedSet = roomApprovedJoiners.get(cleanRoomId);
    const isApprovedJoiner = approvedSet && approvedSet.has(username);

    if (!isRoomCreator && !isDbCollaborator && !isApprovedJoiner) {
      const validToken = roomInviteTokens.get(cleanRoomId);
      if (!validToken || inviteToken !== validToken) {
        const admin = roomAdmins.get(cleanRoomId);
        if (admin) {
          socket.emit(ACTIONS.WAIT_FOR_APPROVAL, {
            message: "Waiting for room admin to approve your request...",
            roomId: cleanRoomId,
          });
          io.to(admin.socketId).emit(ACTIONS.APPROVAL_REQUEST, {
            roomId: cleanRoomId,
            username,
            requesterSocketId: socket.id,
          });
          logger.info(`User ${username} placed in waiting room for ${cleanRoomId}`);
          return;
        } else {
          socket.emit(ACTIONS.INVALID_INVITE, {
            message: "Invalid or missing invite token.",
          });
          logger.info(`User ${username} rejected from room ${cleanRoomId} — invalid token`);
          return;
        }
      }
    }

    // Ban check
    const bannedSet = roomBanList.get(cleanRoomId);
    if (bannedSet && bannedSet.has(username)) {
      socket.emit(ACTIONS.ROOM_BANNED, {
        roomId: cleanRoomId,
        message: "You have been removed by the admin",
      });
      logger.info(`Banned user ${username} rejected from room ${cleanRoomId}`);
      return;
    }

    userSocketMap[socket.id] = username;
    socket.join(cleanRoomId);

    if (!roomAdmins.has(cleanRoomId)) {
      roomAdmins.set(cleanRoomId, { socketId: socket.id, username });
      logger.info(`${username} is now admin of room ${cleanRoomId}`);
    }

    if (roomCleanupTimers.has(cleanRoomId)) {
      clearTimeout(roomCleanupTimers.get(cleanRoomId));
      roomCleanupTimers.delete(cleanRoomId);
      logger.info(`Aborted cleanup for room ${cleanRoomId}`);
    }

    if (!roomPermissions.has(cleanRoomId)) roomPermissions.set(cleanRoomId, new Map());
    if (!roomPermissions.get(cleanRoomId).has(username)) {
      const admin = roomAdmins.get(cleanRoomId);
      const defaultRole = admin && admin.username === username ? "editor" : "viewer";
      roomPermissions.get(cleanRoomId).set(username, defaultRole);
    }

    const clients = getAllConnectedClients(io, cleanRoomId);
    const admin = roomAdmins.get(cleanRoomId);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
        admin: admin ? admin.username : null,
      });
    });

    const files = roomState.get(cleanRoomId);
    socket.emit(ACTIONS.SYNC_CODE, { files: files ? Object.fromEntries(files) : {} });

    socket.emit(ACTIONS.PERMISSION_UPDATED, {
      permissions: Object.fromEntries(roomPermissions.get(cleanRoomId)),
    });
    io.to(cleanRoomId).emit(ACTIONS.PERMISSION_UPDATED, {
      permissions: Object.fromEntries(roomPermissions.get(cleanRoomId)),
    });

    const history = roomMessages.get(cleanRoomId) || [];
    socket.emit(ACTIONS.CHAT_HISTORY, { messages: history });

    if (cursorPositions[cleanRoomId]) {
      socket.emit("cursor-sync", cursorPositions[cleanRoomId]);
    }

    logger.info(`${username} joined room ${cleanRoomId} (${clients.length} clients)`);
  });

  // KICK_USER
  socket.on(ACTIONS.KICK_USER, ({ roomId, targetUsername }) => {
    const admin = roomAdmins.get(roomId);
    if (!admin || admin.socketId !== socket.id) {
      logger.warn(`Non-admin ${userSocketMap[socket.id]} tried to kick in room ${roomId}`);
      return;
    }
    if (targetUsername === admin.username) return;

    if (!roomBanList.has(roomId)) roomBanList.set(roomId, new Set());
    roomBanList.get(roomId).add(targetUsername);
    if (roomPermissions.has(roomId)) roomPermissions.get(roomId).delete(targetUsername);

    const clients = getAllConnectedClients(io, roomId);
    const targetClient = clients.find((c) => c.username === targetUsername);
    if (targetClient) {
      const targetSocket = io.sockets.sockets.get(targetClient.socketId);
      if (targetSocket) {
        targetSocket.emit(ACTIONS.KICKED, { roomId, message: "You have been removed by the admin" });
        targetSocket.leave(roomId);
      }
    }

    const updatedClients = getAllConnectedClients(io, roomId);
    updatedClients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.ROOM_UPDATE, { clients: updatedClients, kickedUser: targetUsername });
    });
    if (roomPermissions.has(roomId)) {
      io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
        permissions: Object.fromEntries(roomPermissions.get(roomId)),
      });
    }
    logger.info(`Admin ${admin.username} kicked ${targetUsername} from room ${roomId}`);
  });

  // REJOIN_REQUEST
  socket.on(ACTIONS.REJOIN_REQUEST, ({ roomId, username }) => {
    const admin = roomAdmins.get(roomId);
    if (!admin) return;
    const bannedSet = roomBanList.get(roomId);
    if (!bannedSet || !bannedSet.has(username)) return;
    io.to(admin.socketId).emit(ACTIONS.APPROVAL_REQUEST, {
      roomId, username, requesterSocketId: socket.id,
    });
    logger.info(`${username} requested rejoin to room ${roomId}`);
  });

  // APPROVE_REJOIN
  socket.on(ACTIONS.APPROVE_REJOIN, ({ roomId, username, requesterSocketId }) => {
    const admin = roomAdmins.get(roomId);
    if (!admin || admin.socketId !== socket.id) return;
    const bannedSet = roomBanList.get(roomId);
    if (bannedSet) bannedSet.delete(username);
    if (!roomApprovedJoiners.has(roomId)) roomApprovedJoiners.set(roomId, new Set());
    roomApprovedJoiners.get(roomId).add(username);
    const validToken = roomInviteTokens.get(roomId);
    io.to(requesterSocketId).emit(ACTIONS.REJOIN_APPROVED, {
      roomId, message: "Your request has been approved!", inviteToken: validToken,
    });
    logger.info(`Admin ${admin.username} approved entry for ${username} in room ${roomId}`);
  });

  // DENY_REJOIN
  socket.on(ACTIONS.DENY_REJOIN, ({ roomId, username, requesterSocketId }) => {
    const admin = roomAdmins.get(roomId);
    if (!admin || admin.socketId !== socket.id) return;
    io.to(requesterSocketId).emit(ACTIONS.REJOIN_DENIED, {
      roomId, message: "Your rejoin request has been denied",
    });
    logger.info(`Admin ${admin.username} denied rejoin for ${username} in room ${roomId}`);
  });
};

module.exports = { registerRoomHandlers };
