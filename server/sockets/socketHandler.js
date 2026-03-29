const ACTIONS = require("../Actions");
const logger = require("../utils/logger");

const userSocketMap = {};

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
      userSocketMap[socket.id] = username;
      socket.join(roomId);

      const clients = getAllConnectedClients(io, roomId);
      clients.forEach(({ socketId }) => {
        io.to(socketId).emit(ACTIONS.JOINED, {
          clients,
          username,
          socketId: socket.id,
        });
      });

      // Send existing cursor positions to the new user
      if (cursorPositions[roomId]) {
        socket.emit("cursor-sync", cursorPositions[roomId]);
      }

      logger.info(`${username} joined room ${roomId} (${clients.length} clients)`);
    });

    // CODE_CHANGE: broadcast code to others in room
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
      socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // SYNC_CODE: send current code to a specific user
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
