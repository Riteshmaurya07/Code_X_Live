const ACTIONS = require("../Actions");
const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const User = require("../models/User");
const Project = require("../models/Project");
const Message = require("../models/Message");

const userSocketMap = {};
const globalUserSockets = new Map(); // userId -> socketId

// Admin Room Control — in-memory structures (reset on server restart)
const roomBanList = new Map();   // roomId → Set of banned usernames
const roomAdmins = new Map();    // roomId → { socketId, username }
const roomApprovedJoiners = new Map(); // roomId → Set of usernames explicitly approved

// FIX: BUG2
const roomState = new Map();     // roomId → Map<fileId, { code, language }>

// Permission Management: Track permissions per room
const roomPermissions = new Map(); // roomId → Map<username, 'editor'|'viewer'>

// Invite tokens: roomId → inviteToken (short nanoid)
const roomInviteTokens = new Map();

// Room cleanup timers to handle reconnect race conditions
const roomCleanupTimers = new Map();

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
  // --- JWT Authentication Middleware ---
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Fetch user from database to ensure we have the correct username even for old tokens
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.user = { id: user._id.toString(), username: user.username };
      next();
    } catch (err) {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.username})`);

    // Register user globally on connect (even outside a room)
    socket.on("REGISTER_USER", (userId) => {
      if (userId) {
        globalUserSockets.set(userId.toString(), socket.id);
        logger.info(`User ${socket.user?.username} (${userId}) registered globally`);
      }
    });

    // CREATE_ROOM: Generate invite token for a new room
    socket.on(ACTIONS.CREATE_ROOM, ({ roomId }) => {
      // Abort pending cleanup if any
      if (roomCleanupTimers.has(roomId)) {
        clearTimeout(roomCleanupTimers.get(roomId));
        roomCleanupTimers.delete(roomId);
      }

      const username = socket.user.username;
      const inviteToken = nanoid(12);
      roomInviteTokens.set(roomId, inviteToken);

      // Pre-set this user as admin
      roomAdmins.set(roomId, { socketId: socket.id, username });

      socket.emit(ACTIONS.ROOM_CREATED, { roomId, inviteToken });
      logger.info(`Room ${roomId} created by ${username} with invite token ${inviteToken}`);
    });

    // JOIN
    socket.on(ACTIONS.JOIN, async ({ roomId, inviteToken: payloadToken }) => {
      const username = socket.user.username; // Always from JWT
      const handshakeToken = socket.handshake.auth?.inviteToken;
      const inviteToken = payloadToken || handshakeToken;
      
      // --- INVITE TOKEN CHECK ---
      // The room creator (admin) is exempt from invite check since they just created it
      let existingAdmin = roomAdmins.get(roomId);
      let isRoomCreator = existingAdmin && existingAdmin.username === username;

      // Handle Database Projects joined from dashboard or via share links
      let isDbCollaborator = false;
      const cleanRoomId = typeof roomId === "string" ? roomId.trim() : roomId;

      if (!isRoomCreator) {
         try {
           let project;
           // Try by ObjectID first
           if (typeof cleanRoomId === "string" && cleanRoomId.match(/^[0-9a-fA-F]{24}$/)) {
             project = await Project.findById(cleanRoomId);
           }
           
           // Fallback to roomId slug if not found by ID
           if (!project) {
             project = await Project.findOne({ roomId: cleanRoomId });
           }

           // Fallback to shareToken if still not found
           if (!project) {
             project = await Project.findOne({ shareToken: cleanRoomId });
           }

           if (project) {
             const userId = socket.user.id.toString();
             if (project.owner.toString() === userId) {
               isRoomCreator = true;
               isDbCollaborator = true;
               // The project owner unconditionally reclaims the room admin
               roomAdmins.set(cleanRoomId, { socketId: socket.id, username });
               existingAdmin = { socketId: socket.id, username };
               logger.info(`Owner ${username} identified for project room ${cleanRoomId} and reclaimed admin`);
             } else {
               // Check if they are a collaborator
               const isCollab = project.collaborators.some(c => c.user && c.user.toString() === userId);
               if (isCollab) {
                 isDbCollaborator = true;
                 logger.info(`Collaborator ${username} identified for project room ${cleanRoomId}`);
               }
             }
           } else {
             logger.debug(`No database project found for roomId: ${cleanRoomId}`);
           }
         } catch (err) {
           logger.error(`Failed to fetch project ${cleanRoomId} on join:`, err.message);
         }
      }

      let isApprovedJoiner = false;
      const approvedSet = roomApprovedJoiners.get(cleanRoomId);
      if (approvedSet && approvedSet.has(username)) {
        isApprovedJoiner = true;
      }

      if (!isRoomCreator && !isDbCollaborator && !isApprovedJoiner) {
        const validToken = roomInviteTokens.get(cleanRoomId);
        if (!validToken || inviteToken !== validToken) {
          const admin = roomAdmins.get(cleanRoomId);
          if (admin) {
            // Admin is present: route to Waiting Room instead of outright rejection
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
            logger.error(`[AUTH_FAIL] Room: ${cleanRoomId} | User: ${username} | Expected Token: '${validToken}' | Received Token: '${inviteToken}'`);
            socket.emit(ACTIONS.INVALID_INVITE, {
              message: "Invalid or missing invite token. You need a valid invite link to join this room.",
            });
            logger.info(`User ${username} rejected from room ${cleanRoomId} — invalid invite token`);
            return;
          }
        }
      }

      // --- BAN CHECK ---
      const bannedSet = roomBanList.get(cleanRoomId);
      if (bannedSet && bannedSet.has(username)) {
        // User is banned — reject immediately
        socket.emit(ACTIONS.ROOM_BANNED, {
          roomId: cleanRoomId,
          message: "You have been removed by the admin",
        });
        logger.info(`Banned user ${username} rejected from room ${cleanRoomId}`);
        return;
      }

      userSocketMap[socket.id] = username;
      socket.join(cleanRoomId);

      // --- ADMIN TRACKING ---
      // First user to join a room becomes its admin
      if (!roomAdmins.has(cleanRoomId)) {
        roomAdmins.set(cleanRoomId, { socketId: socket.id, username });
        logger.info(`${username} is now admin of room ${cleanRoomId}`);
      }

      // Abort pending cleanup if a user securely connected
      if (roomCleanupTimers.has(cleanRoomId)) {
        clearTimeout(roomCleanupTimers.get(cleanRoomId));
        roomCleanupTimers.delete(cleanRoomId);
        logger.info(`Aborted cleanup for room ${cleanRoomId}`);
      }

      // --- PERMISSION TRACKING ---
      // Initialize permission map for room if needed
      if (!roomPermissions.has(cleanRoomId)) {
        roomPermissions.set(cleanRoomId, new Map());
      }
      // Set default permission for new user:
      // Room creator (admin) → 'admin', everyone else → 'viewer'
      if (!roomPermissions.get(cleanRoomId).has(username)) {
        const admin = roomAdmins.get(cleanRoomId);
        const defaultRole = (admin && admin.username === username) ? "editor" : "viewer";
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

      // FIX: BUG2
      const files = roomState.get(cleanRoomId);
      socket.emit(ACTIONS.SYNC_CODE, {
        files: files ? Object.fromEntries(files) : {}
      });

      // Send current permissions to the new user
      socket.emit(ACTIONS.PERMISSION_UPDATED, {
        permissions: Object.fromEntries(roomPermissions.get(cleanRoomId)),
      });

      // Broadcast updated permissions to all in room
      io.to(cleanRoomId).emit(ACTIONS.PERMISSION_UPDATED, {
        permissions: Object.fromEntries(roomPermissions.get(cleanRoomId)),
      });

      // Send chat history (last 50 room messages) to new user
      const history = roomMessages.get(cleanRoomId) || [];
      socket.emit(ACTIONS.CHAT_HISTORY, { messages: history });

      // Send existing cursor positions to the new user
      if (cursorPositions[cleanRoomId]) {
        socket.emit("cursor-sync", cursorPositions[cleanRoomId]);
      }

      logger.info(`${username} joined room ${cleanRoomId} (${clients.length} clients)`);
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

    // APPROVE_REJOIN: Admin approves a banned or waiting user's entry
    socket.on(ACTIONS.APPROVE_REJOIN, ({ roomId, username, requesterSocketId }) => {
      const admin = roomAdmins.get(roomId);
      if (!admin || admin.socketId !== socket.id) return;

      // Remove from ban list if present
      const bannedSet = roomBanList.get(roomId);
      if (bannedSet) {
        bannedSet.delete(username);
      }

      // Add to approved joiners list so they can bypass token requirements
      if (!roomApprovedJoiners.has(roomId)) {
        roomApprovedJoiners.set(roomId, new Set());
      }
      roomApprovedJoiners.get(roomId).add(username);

      const validToken = roomInviteTokens.get(roomId);

      // Notify the requesting user
      io.to(requesterSocketId).emit(ACTIONS.REJOIN_APPROVED, {
        roomId,
        message: "Your request has been approved!",
        inviteToken: validToken,
      });

      logger.info(`Admin ${admin.username} approved entry for ${username} in room ${roomId}`);
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

    // PROMOTE_TO_EDITOR: Admin promotes a viewer to editor
    socket.on(ACTIONS.PROMOTE_TO_EDITOR, ({ roomId, targetUsername }) => {
      const admin = roomAdmins.get(roomId);
      if (!admin || admin.socketId !== socket.id) return;
      if (targetUsername === admin.username) return;

      if (!roomPermissions.has(roomId)) return;
      roomPermissions.get(roomId).set(targetUsername, "editor");

      // Broadcast updated permissions
      io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
        permissions: Object.fromEntries(roomPermissions.get(roomId)),
      });

      // Send targeted role update event so the user gets a toast
      io.to(roomId).emit(ACTIONS.ROLE_UPDATED, {
        targetUsername,
        newRole: "editor",
        message: `${targetUsername} has been granted editor access`,
      });

      logger.info(`Admin ${admin.username} promoted ${targetUsername} to editor in room ${roomId}`);
    });

    // DEMOTE_TO_VIEWER: Admin demotes an editor to viewer
    socket.on(ACTIONS.DEMOTE_TO_VIEWER, ({ roomId, targetUsername }) => {
      const admin = roomAdmins.get(roomId);
      if (!admin || admin.socketId !== socket.id) return;
      if (targetUsername === admin.username) return;

      if (!roomPermissions.has(roomId)) return;
      roomPermissions.get(roomId).set(targetUsername, "viewer");

      // Broadcast updated permissions
      io.to(roomId).emit(ACTIONS.PERMISSION_UPDATED, {
        permissions: Object.fromEntries(roomPermissions.get(roomId)),
      });

      // Send targeted role update event so the user gets a toast
      io.to(roomId).emit(ACTIONS.ROLE_UPDATED, {
        targetUsername,
        newRole: "viewer",
        message: `${targetUsername}'s editor access has been revoked`,
      });

      logger.info(`Admin ${admin.username} demoted ${targetUsername} to viewer in room ${roomId}`);
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

    // ====== CHAT: Global Direct Messaging ======
    socket.on(ACTIONS.GLOBAL_SEND_MESSAGE, async ({ recipientId, content }) => {
      try {
        const senderId = socket.user.id;
        if (!senderId || !recipientId) return;

        // Check if recipient follows the sender, OR if they have existing non-request messages
        // If receiver follows sender -> isRequest = false.
        const recipientDoc = await User.findById(recipientId).select("following");
        let isRequest = true;

        if (recipientDoc && recipientDoc.following.includes(senderId)) {
          isRequest = false;
        } else {
          // Check if there's any existing non-request message where recipient was sender and we were receiver
          const existingNonRequest = await Message.findOne({
            sender: recipientId,
            receiver: senderId,
            isRequest: false
          });
          if (existingNonRequest) {
            isRequest = false;
          }
        }

        // Save to DB
        const newMessage = await Message.create({
          sender: senderId,
          receiver: recipientId,
          content,
          isRequest,
          isRead: false
        });

        // Broadcast to receiver if they're online
        const recipientSocketId = globalUserSockets.get(recipientId.toString());
        if (recipientSocketId) {
          io.to(recipientSocketId).emit(ACTIONS.GLOBAL_RECEIVE_MESSAGE, {
            ...newMessage.toObject(),
            senderName: socket.user.username // Attach for UI ease
          });
        }

        // Echo to sender so UI updates
        socket.emit(ACTIONS.GLOBAL_RECEIVE_MESSAGE, {
          ...newMessage.toObject(),
          senderName: socket.user.username
        });

      } catch (err) {
        logger.error(`Error sending global message: ${err.message}`);
      }
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
          }
        }

        // Check if room is now empty
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        // roomSockets includes the disconnecting socket until 'disconnect' completes
        // so size <= 1 means this is the last one
        if (!roomSockets || roomSockets.size <= 1) {
          // Schedule a cleanup to prevent StrictMode race conditions
          const timeout = setTimeout(() => {
            const currentSockets = io.sockets.adapter.rooms.get(roomId);
            if (!currentSockets || currentSockets.size === 0) {
              roomState.delete(roomId);
              roomPermissions.delete(roomId);
              roomAdmins.delete(roomId);
              roomBanList.delete(roomId);
              roomApprovedJoiners.delete(roomId);
              roomMessages.delete(roomId);
              roomInviteTokens.delete(roomId);
              roomCleanupTimers.delete(roomId);
              logger.info(`Room ${roomId} strictly cleaned up (grace period expired)`);
            }
          }, 10000); // 10 seconds grace period
          
          roomCleanupTimers.set(roomId, timeout);
        }
      });

      delete userSocketMap[socket.id];
      delete cursorThrottle[socket.id];

      if (username) {
        logger.info(`${username} disconnected (${socket.id})`);
      }

      // Cleanup global registration
      if (socket.user?.id) {
        const uid = socket.user.id.toString();
        if (globalUserSockets.get(uid) === socket.id) {
          globalUserSockets.delete(uid);
        }
      }
    });
  });
};

const getSocketIdByUserId = (userId) => {
  if (!userId) return null;
  return globalUserSockets.get(userId.toString());
};

module.exports = { setupSocket, getSocketIdByUserId };
