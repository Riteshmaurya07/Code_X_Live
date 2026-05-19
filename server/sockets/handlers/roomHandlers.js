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
    
    // Fetch the project we just created (or found) to get the canonical _id
    const project = await Project.findOne({ roomId });
    socket.emit(ACTIONS.ROOM_CREATED, { roomId, inviteToken, project });
    logger.info(`Room ${roomId} created by ${username} with invite token ${inviteToken}`);
  });

  // JOIN
  socket.on(ACTIONS.JOIN, async ({ roomId: inputRoomId, inviteToken: payloadToken }) => {
    const username = socket.user.username;
    const handshakeToken = socket.handshake.auth?.inviteToken;
    const inviteToken = payloadToken || handshakeToken;
    const rawRoomId = typeof inputRoomId === "string" ? inputRoomId.trim() : inputRoomId;

    // Resolve canonical room identifier (ObjectId if persistent, else rawRoomId)
    let project;
    try {
      if (typeof rawRoomId === "string" && rawRoomId.match(/^[0-9a-fA-F]{24}$/)) {
        project = await Project.findById(rawRoomId);
      }
      if (!project) project = await Project.findOne({ roomId: rawRoomId });
      if (!project) project = await Project.findOne({ shareToken: rawRoomId });
    } catch (err) {
      logger.error(`Error resolving project for room join: ${err.message}`);
    }

    const cleanRoomId = project ? project._id.toString() : rawRoomId;

    // Check if user is owner/collaborator
    let isRoomCreator = false;
    let isDbCollaborator = false;

    if (project) {
      const userId = socket.user.id.toString();
      if (project.owner.toString() === userId) {
        isRoomCreator = true;
        isDbCollaborator = true;
        roomAdmins.set(cleanRoomId, { socketId: socket.id, username });
        logger.info(`Owner ${username} joined canonical room ${cleanRoomId}`);
      } else {
        const isCollab = project.collaborators.some(
          (c) => c.user && c.user.toString() === userId
        );
        if (isCollab) {
          isDbCollaborator = true;
        }
      }
    } else {
      const existingAdmin = roomAdmins.get(cleanRoomId);
      if (existingAdmin && existingAdmin.username === username) {
        isRoomCreator = true;
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
          return;
        } else {
          socket.emit(ACTIONS.INVALID_INVITE, { message: "Invalid or missing invite token." });
          return;
        }
      }
    }

    // Ban check
    const bannedSet = roomBanList.get(cleanRoomId);
    if (bannedSet && bannedSet.has(username)) {
      socket.emit(ACTIONS.ROOM_BANNED, { roomId: cleanRoomId, message: "You have been removed by the admin" });
      return;
    }

    userSocketMap[socket.id] = username;
    socket.join(cleanRoomId);
    socket.currentRoom = cleanRoomId;

    if (!roomAdmins.has(cleanRoomId)) {
      roomAdmins.set(cleanRoomId, { socketId: socket.id, username });
    }

    if (roomCleanupTimers.has(cleanRoomId)) {
      clearTimeout(roomCleanupTimers.get(cleanRoomId));
      roomCleanupTimers.delete(cleanRoomId);
    }

    if (!roomPermissions.has(cleanRoomId)) roomPermissions.set(cleanRoomId, new Map());
    
    // Resolve user role from Project collaborators list or owner check, or default to viewer
    const admin = roomAdmins.get(cleanRoomId);
    let assignedRole = "viewer";

    if (project) {
      const userId = socket.user?.id ? socket.user.id.toString() : null;
      if (project.owner && userId && project.owner.toString() === userId) {
        assignedRole = "editor";
      } else if (userId) {
        const collab = project.collaborators.find(
          (c) => c.user && c.user.toString() === userId
        );
        if (collab) {
          assignedRole = collab.role;
        }
      }
    } else {
      if (admin && admin.username === username) {
        assignedRole = "editor";
      }
    }

    roomPermissions.get(cleanRoomId).set(username, assignedRole);

    const clients = getAllConnectedClients(io, cleanRoomId);

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
    socket.emit(ACTIONS.PERMISSION_UPDATED, { permissions: Object.fromEntries(roomPermissions.get(cleanRoomId)) });
    io.to(cleanRoomId).emit(ACTIONS.PERMISSION_UPDATED, { permissions: Object.fromEntries(roomPermissions.get(cleanRoomId)) });

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
