const ACTIONS = require("../Actions");
const logger = require("../utils/logger");

const userSocketMap = {};

// Admin Room Control — in-memory structures (reset on server restart)
const roomBanList = new Map();   // roomId → Set of banned usernames
const roomAdmins = new Map();    // roomId → { socketId, username }

// FIX: BUG2
const roomState = new Map();     // roomId → Map<fileId, { code, language }>

// Permission Management: Track permissions per room
const roomPermissions = new Map(); // roomId → Map<username, 'editor'|'viewer'>

// Chat: In-memory message stores (reset on server restart)
const MAX_ROOM_MESSAGES = 50;
const roomMessages = new Map();      // roomId → Array<{ senderId, senderName, message, timestamp }>
const privateMessages = new Map();   // "sortedUserA__sortedUserB" → Array<{ senderId, senderName, recipientId, message, timestamp }>

const getAllConnectedClients = (io, roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({
      socketId,
      username: userSocketMap[socketId],
    })
  );
};

// Track cursor positions per room
const cursorPositions = {};

// Throttle map: socketId -> lastCursorEmit timestamp
const cursorThrottle = {};
const CURSOR_THROTTLE_MS = 100; // Max 10 updates/sec

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // JOIN
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
      // --- BAN CHECK ---
      const bannedSet = roomBanList.get(roomId);
      if (bannedSet && bannedSet.has(username)) {
        // User is banned — reject immediately
        socket.emit(ACTIONS.ROOM_BANNED, {
          roomId,
          message: "You have been removed by the admin",
        });
        logger.info(`Banned user ${username} rejected from room ${roomId}`);
        return;
      }

      userSocketMap[socket.id] = username;
      socket.join(roomId);

      // --- ADMIN TRACKING ---
      // First user to join a room becomes its admin
      if (!roomAdmins.has(roomId)) {
        roomAdmins.set(roomId, { socketId: socket.id, username });
        logger.info(`${username} is now admin of room ${roomId}`);
      }

      // --- PERMISSION TRACKING ---
      // Initialize permission map for room if needed
      if (!roomPermissions.has(roomId)) {
        roomPermissions.set(roomId, new Map());
      }
      // Set default permission for new user as 'editor'
      // (admin always has full access regardless)
      if (!roomPermissions.get(roomId).has(username)) {
        roomPermissions.get(roomId).set(username, "editor");
      }

      const clients = getAllConnectedClients(io, roomId);
      const admin = roomAdmins.get(roomId);

      clients.forEach(({ socketId }) => {
        io.to(socketId).emit(ACTIONS.JOINED, {
          clients,
          username,
          socketId: socket.id,
          admin: admin ? admin.username : null,
        });
      });

      // FIX: BUG2
      const files = roomState.get(roomId);
      socket.emit(ACTIONS.SYNC_CODE, {
        files: files ? Object.fromEntries(files) : {}
      });

      // Send current permissions to the new user
      socket.emit(ACTIONS.PERMISSION_UPDATED, {
        permissions: Object.fromEntries(roomPermissions.get(roomId)),
      });

      // Broadcast updated permissions to all in room
      io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
        permissions: Object.fromEntries(roomPermissions.get(roomId)),
      });

      // Send chat history (last 50 room messages) to new user
      const history = roomMessages.get(roomId) || [];
      socket.emit(ACTIONS.CHAT_HISTORY, { messages: history });

      // Send existing cursor positions to the new user
      if (cursorPositions[roomId]) {
        socket.emit("cursor-sync", cursorPositions[roomId]);
      }

      logger.info(`${username} joined room ${roomId} (${clients.length} clients)`);
    });

    // KICK_USER: Admin removes a user from the room
    socket.on(ACTIONS.KICK_USER, ({ roomId, targetUsername }) => {
      const admin = roomAdmins.get(roomId);

      // Verify the requester is the room admin
      if (!admin || admin.socketId !== socket.id) {
        logger.warn(`Non-admin ${userSocketMap[socket.id]} tried to kick in room ${roomId}`);
        return;
      }

      // Prevent admin from kicking themselves
      if (targetUsername === admin.username) return;

      // Add to ban list
      if (!roomBanList.has(roomId)) {
        roomBanList.set(roomId, new Set());
      }
      roomBanList.get(roomId).add(targetUsername);

      // Clean up permissions for kicked user
      if (roomPermissions.has(roomId)) {
        roomPermissions.get(roomId).delete(targetUsername);
      }

      // Find the target socket
      const clients = getAllConnectedClients(io, roomId);
      const targetClient = clients.find((c) => c.username === targetUsername);

      if (targetClient) {
        const targetSocket = io.sockets.sockets.get(targetClient.socketId);
        if (targetSocket) {
          // Notify the kicked user
          targetSocket.emit(ACTIONS.KICKED, {
            roomId,
            message: "You have been removed by the admin",
          });
          // Force leave
          targetSocket.leave(roomId);
        }
      }

      // Broadcast updated client list to remaining users
      const updatedClients = getAllConnectedClients(io, roomId);
      updatedClients.forEach(({ socketId }) => {
        io.to(socketId).emit(ACTIONS.ROOM_UPDATE, {
          clients: updatedClients,
          kickedUser: targetUsername,
        });
      });

      // Broadcast updated permissions
      if (roomPermissions.has(roomId)) {
        io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
          permissions: Object.fromEntries(roomPermissions.get(roomId)),
        });
      }

      logger.info(`Admin ${admin.username} kicked ${targetUsername} from room ${roomId}`);
    });

    // REJOIN_REQUEST: Banned user requests re-entry
    socket.on(ACTIONS.REJOIN_REQUEST, ({ roomId, username }) => {
      const admin = roomAdmins.get(roomId);
      if (!admin) return;

      const bannedSet = roomBanList.get(roomId);
      if (!bannedSet || !bannedSet.has(username)) return; // Not banned, just join normally

      // Forward request to admin
      io.to(admin.socketId).emit(ACTIONS.APPROVAL_REQUEST, {
        roomId,
        username,
        requesterSocketId: socket.id,
      });

      logger.info(`${username} requested rejoin to room ${roomId}`);
    });

    // APPROVE_REJOIN: Admin approves a banned user's re-entry
    socket.on(ACTIONS.APPROVE_REJOIN, ({ roomId, username, requesterSocketId }) => {
      const admin = roomAdmins.get(roomId);
      if (!admin || admin.socketId !== socket.id) return;

      // Remove from ban list
      const bannedSet = roomBanList.get(roomId);
      if (bannedSet) {
        bannedSet.delete(username);
      }

      // Notify the requesting user
      io.to(requesterSocketId).emit(ACTIONS.REJOIN_APPROVED, {
        roomId,
        message: "Your rejoin request has been approved",
      });

      logger.info(`Admin ${admin.username} approved rejoin for ${username} in room ${roomId}`);
    });

    // DENY_REJOIN: Admin denies a banned user's re-entry
    socket.on(ACTIONS.DENY_REJOIN, ({ roomId, username, requesterSocketId }) => {
      const admin = roomAdmins.get(roomId);
      if (!admin || admin.socketId !== socket.id) return;

      io.to(requesterSocketId).emit(ACTIONS.REJOIN_DENIED, {
        roomId,
        message: "Your rejoin request has been denied",
      });

      logger.info(`Admin ${admin.username} denied rejoin for ${username} in room ${roomId}`);
    });

    // SET_PERMISSION: Admin sets a user's permission level
    socket.on(ACTIONS.SET_PERMISSION, ({ roomId, targetUsername, permission }) => {
      const admin = roomAdmins.get(roomId);

      // Verify the requester is the room admin
      if (!admin || admin.socketId !== socket.id) {
        logger.warn(`Non-admin ${userSocketMap[socket.id]} tried to set permission in room ${roomId}`);
        return;
      }

      // Cannot change admin's own permission
      if (targetUsername === admin.username) return;

      // Validate permission value
      if (permission !== "editor" && permission !== "viewer") return;

      // Update permissions
      if (!roomPermissions.has(roomId)) {
        roomPermissions.set(roomId, new Map());
      }
      roomPermissions.get(roomId).set(targetUsername, permission);

      // Broadcast updated permissions to all in room
      io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
        permissions: Object.fromEntries(roomPermissions.get(roomId)),
      });

      logger.info(`Admin ${admin.username} set ${targetUsername} to '${permission}' in room ${roomId}`);
    });

    // CODE_CHANGE: broadcast code to others in room
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, fileId, code, language }) => {
      const username = userSocketMap[socket.id];

      // --- PERMISSION CHECK ---
      const admin = roomAdmins.get(roomId);
      const isAdmin = admin && admin.socketId === socket.id;

      if (!isAdmin) {
        const perm = roomPermissions.get(roomId)?.get(username);
        if (perm === "viewer") {
          socket.emit(ACTIONS.PERMISSION_DENIED, {
            message: "You have view-only access",
          });
          return;
        }
      }

      // FIX: BUG2
      if (!roomState.has(roomId)) roomState.set(roomId, new Map());
      roomState.get(roomId).set(fileId, { code, language });

      socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { fileId, code, language });
    });

    // SYNC_CODE: send current code to a specific user (legacy client-to-client)
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
      io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // FILE_CHANGE: broadcast active file change to room
    socket.on("file-change", ({ roomId, fileId, fileName }) => {
      socket.in(roomId).emit("file-changed", {
        socketId: socket.id,
        username: userSocketMap[socket.id],
        fileId,
        fileName,
      });
    });

    // CURSOR_MOVE: broadcast cursor position (throttled)
    socket.on("cursor-move", ({ roomId, cursor }) => {
      const now = Date.now();
      const lastEmit = cursorThrottle[socket.id] || 0;

      if (now - lastEmit < CURSOR_THROTTLE_MS) {
        return; // Skip — too frequent
      }
      cursorThrottle[socket.id] = now;

      if (!cursorPositions[roomId]) {
        cursorPositions[roomId] = {};
      }
      cursorPositions[roomId][socket.id] = {
        username: userSocketMap[socket.id],
        ...cursor,
      };

      socket.in(roomId).emit("cursor-update", {
        socketId: socket.id,
        username: userSocketMap[socket.id],
        cursor,
      });
    });

    // COMMENT: broadcast inline comments
    socket.on("add-comment", ({ roomId, comment }) => {
      socket.in(roomId).emit("new-comment", {
        ...comment,
        username: userSocketMap[socket.id],
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    });

    // ====== CHAT: Room Message ======
    socket.on(ACTIONS.SEND_ROOM_MESSAGE, ({ roomId, senderId, senderName, message, timestamp }) => {
      const msg = { senderId, senderName, message, timestamp: timestamp || new Date().toISOString() };

      // Store in memory (cap at MAX_ROOM_MESSAGES)
      if (!roomMessages.has(roomId)) roomMessages.set(roomId, []);
      const msgs = roomMessages.get(roomId);
      msgs.push(msg);
      if (msgs.length > MAX_ROOM_MESSAGES) msgs.shift();

      // Broadcast to all in room (including sender)
      io.to(roomId).emit(ACTIONS.RECEIVE_ROOM_MESSAGE, msg);
    });

    // ====== CHAT: Private (DM) Message ======
    socket.on(ACTIONS.SEND_PRIVATE_MESSAGE, ({ roomId, senderId, senderName, recipientId, message, timestamp }) => {
      const msg = { senderId, senderName, recipientId, message, timestamp: timestamp || new Date().toISOString() };

      // Store in memory keyed by sorted pair so both sides share the thread
      const dmKey = [senderId, recipientId].sort().join("__");
      if (!privateMessages.has(dmKey)) privateMessages.set(dmKey, []);
      const dms = privateMessages.get(dmKey);
      dms.push(msg);
      if (dms.length > MAX_ROOM_MESSAGES) dms.shift();

      // Find the recipient's socketId(s) in the room
      const clients = getAllConnectedClients(io, roomId);
      const recipientClient = clients.find((c) => c.username === recipientId);

      // Send to recipient
      if (recipientClient) {
        io.to(recipientClient.socketId).emit(ACTIONS.RECEIVE_PRIVATE_MESSAGE, msg);
      }
      // Echo back to sender so they see their own message
      socket.emit(ACTIONS.RECEIVE_PRIVATE_MESSAGE, msg);
    });

    // DISCONNECTING
    socket.on("disconnecting", () => {
      const rooms = [...socket.rooms];
      const username = userSocketMap[socket.id];

      rooms.forEach((roomId) => {
        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username,
        });

        // Clean up cursor positions
        if (cursorPositions[roomId]) {
          delete cursorPositions[roomId][socket.id];
        }

        // If admin disconnects, promote next user or clean up room
        const admin = roomAdmins.get(roomId);
        if (admin && admin.socketId === socket.id) {
          const remainingClients = getAllConnectedClients(io, roomId).filter(
            (c) => c.socketId !== socket.id
          );
          if (remainingClients.length > 0) {
            // Promote the next user
            const newAdmin = remainingClients[0];
            roomAdmins.set(roomId, {
              socketId: newAdmin.socketId,
              username: newAdmin.username,
            });
            // Notify all remaining users about the new admin
            remainingClients.forEach(({ socketId }) => {
              io.to(socketId).emit(ACTIONS.ROOM_UPDATE, {
                clients: remainingClients,
                newAdmin: newAdmin.username,
              });
            });
            logger.info(`Admin promoted: ${newAdmin.username} in room ${roomId}`);
          } else {
            // Room is empty — clean up ALL in-memory state
            roomAdmins.delete(roomId);
            roomBanList.delete(roomId);
            roomState.delete(roomId);
            roomPermissions.delete(roomId);
            roomMessages.delete(roomId);
          }
        }

        // Check if room is now empty (non-admin disconnect case)
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        // roomSockets includes the disconnecting socket until 'disconnect' completes
        // so size === 1 means this is the last one
        if (!roomSockets || roomSockets.size <= 1) {
          roomState.delete(roomId);
          roomPermissions.delete(roomId);
          roomAdmins.delete(roomId);
          roomBanList.delete(roomId);
          roomMessages.delete(roomId);
        }
      });

      delete userSocketMap[socket.id];
      delete cursorThrottle[socket.id];

      if (username) {
        logger.info(`${username} disconnected (${socket.id})`);
      }
    });
  });
};

module.exports = setupSocket;
