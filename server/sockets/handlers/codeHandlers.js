/**
 * codeHandlers.js — Handles real-time code sync, file change events, 
 *                   cursor movement, and inline comments.
 */
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const {
  userSocketMap,
  roomAdmins,
  roomPermissions,
  roomState,
  cursorPositions,
  cursorThrottle,
  CURSOR_THROTTLE_MS,
} = require("../roomState");

const registerCodeHandlers = (io, socket) => {

  // CODE_CHANGE: broadcast code changes to other room members
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, fileId, code, language }) => {
    const username = userSocketMap[socket.id];
    const admin = roomAdmins.get(roomId);
    const isAdmin = admin && admin.socketId === socket.id;

    // Permission check for non-admins
    if (!isAdmin) {
      const perm = roomPermissions.get(roomId)?.get(username);
      if (perm === "viewer") {
        socket.emit(ACTIONS.PERMISSION_DENIED, { message: "You have view-only access" });
        return;
      }
    }

    // Persist in room state
    if (!roomState.has(roomId)) roomState.set(roomId, new Map());
    roomState.get(roomId).set(fileId, { code, language });

    // Broadcast to others (not back to sender)
    socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { fileId, code, language });
  });

  // FILE_CHANGE: notify others which file a user is viewing
  socket.on("file-change", ({ roomId, fileId, fileName }) => {
    socket.in(roomId).emit("file-changed", {
      socketId: socket.id,
      username: userSocketMap[socket.id],
      fileId,
      fileName,
    });
  });

  // CURSOR_MOVE: broadcast cursor position with throttling
  socket.on("cursor-move", ({ roomId, cursor }) => {
    const now = Date.now();
    const lastEmit = cursorThrottle[socket.id] || 0;
    if (now - lastEmit < CURSOR_THROTTLE_MS) return;
    cursorThrottle[socket.id] = now;

    if (!cursorPositions[roomId]) cursorPositions[roomId] = {};
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

  // CURSOR_SYNC_REQUEST: send existing cursor positions to a newly joined socket
  socket.on("cursor-sync-request", ({ roomId }) => {
    const positions = cursorPositions[roomId] || {};
    socket.emit("cursor-sync", positions);
  });

  // INLINE COMMENT: broadcast to room
  socket.on("add-comment", ({ roomId, comment }) => {
    socket.in(roomId).emit("new-comment", {
      ...comment,
      username: userSocketMap[socket.id],
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
  });

  // FOLDER_CREATED: relay virtual folder creation to the rest of the room.
  // No DB write — folders are frontend-only and live in each client's knownFolders Set.
  socket.on(ACTIONS.FOLDER_CREATED, ({ roomId, path }) => {
    socket.to(roomId).emit(ACTIONS.FOLDER_CREATED, { path });
  });

  // FOLDER_DELETED: relay virtual folder deletion to the rest of the room.
  socket.on(ACTIONS.FOLDER_DELETED, ({ roomId, path }) => {
    socket.to(roomId).emit(ACTIONS.FOLDER_DELETED, { path });
  });
};

module.exports = { registerCodeHandlers };
