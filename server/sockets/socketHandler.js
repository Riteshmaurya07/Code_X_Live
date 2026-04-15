/**
 * socketHandler.js — Socket.IO entry point.
 *
 * Responsibilities:
 *   1. JWT authentication middleware
 *   2. Wire up modular event handlers per connection
 *
 * Business logic lives in ./handlers/:
 *   - roomHandlers       CREATE_ROOM, JOIN, KICK, REJOIN flow
 *   - permissionHandlers SET_PERMISSION, PROMOTE, DEMOTE
 *   - codeHandlers       CODE_CHANGE, file-change, cursor-move, comments
 *   - chatHandlers       Room messages, private DMs, global DMs
 *   - disconnectHandlers Cleanup, admin promotion, room teardown
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const { globalUserSockets } = require("./roomState");

const { registerRoomHandlers }       = require("./handlers/roomHandlers");
const { registerPermissionHandlers } = require("./handlers/permissionHandlers");
const { registerCodeHandlers }       = require("./handlers/codeHandlers");
const { registerChatHandlers }       = require("./handlers/chatHandlers");
const { registerDisconnectHandlers } = require("./handlers/disconnectHandlers");

const setupSocket = (io) => {

  // ── JWT Auth Middleware ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = { id: user._id.toString(), username: user.username };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // ── Per-connection handler registration ─────────────────────────────
  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.username})`);

    registerRoomHandlers(io, socket);
    registerPermissionHandlers(io, socket);
    registerCodeHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerDisconnectHandlers(io, socket);
  });
};

// Used by notificationController to push real-time notifications
const getSocketIdByUserId = (userId) => {
  if (!userId) return null;
  return globalUserSockets.get(userId.toString());
};

module.exports = { setupSocket, getSocketIdByUserId };
