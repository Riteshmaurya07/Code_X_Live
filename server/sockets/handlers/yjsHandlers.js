const Y = require("yjs");
const crypto = require("crypto");
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const File = require("../../models/File");
const { userSocketMap, roomPermissions } = require("../roomState");

const MAX_UPDATE_SIZE = 100 * 1024; // 100KB per update
const FLUSH_INTERVAL_MS = 5000; // 5 seconds debounce

// Store active Yjs documents
// fileId -> { doc: Y.Doc, flushTimer: NodeJS.Timeout, isFlushing: boolean }
const serverYDocs = new Map();

const getRoom = (socket, payloadRoomId) => socket.currentRoom || payloadRoomId;

const getOrCreateServerDoc = async (fileId) => {
  if (serverYDocs.has(fileId)) {
    return serverYDocs.get(fileId);
  }

  const doc = new Y.Doc();
  const entry = {
    doc,
    flushTimer: null,
    isFlushing: false,
  };
  serverYDocs.set(fileId, entry);

  try {
    const file = await File.findById(fileId);
    if (file) {
      if (file.yjsState) {
        Y.applyUpdate(doc, file.yjsState);
      }
      if (file.yjsUpdates && file.yjsUpdates.length > 0) {
        file.yjsUpdates.forEach((u) => {
          if (u.update) Y.applyUpdate(doc, u.update);
        });
      }
      // If no Yjs state exists yet but text content does (legacy migration)
      if (!file.yjsState && (!file.yjsUpdates || file.yjsUpdates.length === 0) && file.content) {
        const text = doc.getText("monaco");
        text.insert(0, file.content);
        queueFlush(fileId);
      }
    }
  } catch (err) {
    logger.error(`Error loading Yjs doc for file ${fileId}: ${err.message}`);
  }

  return entry;
};

const queueFlush = (fileId) => {
  const entry = serverYDocs.get(fileId);
  if (!entry) return;

  if (entry.flushTimer) clearTimeout(entry.flushTimer);

  entry.flushTimer = setTimeout(async () => {
    if (entry.isFlushing) {
      queueFlush(fileId);
      return;
    }
    entry.isFlushing = true;

    try {
      const compactedState = Buffer.from(Y.encodeStateAsUpdate(entry.doc));
      const newContent = entry.doc.getText("monaco").toString();

      const file = await File.findById(fileId).select("yjsUpdates");
      if (!file) return;
      const idsToRemove = file.yjsUpdates.map(u => u.id);

      await File.updateOne(
        { _id: fileId },
        { 
          $set: { yjsState: compactedState, content: newContent },
          $pull: { yjsUpdates: { id: { $in: idsToRemove } } } 
        }
      );
    } catch (err) {
      logger.error(`Error flushing Yjs doc ${fileId}: ${err.message}`);
    } finally {
      entry.isFlushing = false;
    }
  }, FLUSH_INTERVAL_MS);
};

const registerYjsHandlers = (io, socket) => {

  // Step 1: Client requests sync, we send back our state vector
  socket.on(ACTIONS.YJS_SYNC_STEP_1, async ({ roomId, fileId }, callback) => {
    const targetRoom = getRoom(socket, roomId);
    if (!targetRoom) {
      if (callback) callback({ error: "No room" });
      return;
    }
    
    // Auth check (allow viewer too, they can read)
    const username = userSocketMap[socket.id];
    const perm = roomPermissions.get(targetRoom)?.get(username);
    if (!perm) {
      if (callback) callback({ error: "Not authorized" });
      return;
    }

    try {
      const entry = await getOrCreateServerDoc(fileId);
      const sv = Y.encodeStateVector(entry.doc);
      if (callback) callback({ sv: Array.from(sv) });
    } catch (err) {
      if (callback) callback({ error: err.message });
    }
  });

  // Step 2: Client sends their state vector, we send missing updates
  socket.on(ACTIONS.YJS_SYNC_STEP_2, async ({ roomId, fileId, sv }, callback) => {
    const targetRoom = getRoom(socket, roomId);
    if (!targetRoom) {
      if (callback) callback({ error: "No room" });
      return;
    }

    const username = userSocketMap[socket.id];
    const perm = roomPermissions.get(targetRoom)?.get(username);
    if (!perm) {
      if (callback) callback({ error: "Not authorized" });
      return;
    }

    try {
      const entry = await getOrCreateServerDoc(fileId);
      const clientSv = new Uint8Array(sv);
      const update = Y.encodeStateAsUpdate(entry.doc, clientSv);
      if (callback) callback({ update: Array.from(update) });
    } catch (err) {
      if (callback) callback({ error: err.message });
    }
  });

  // Handle updates from clients
  socket.on(ACTIONS.YJS_UPDATE, async ({ roomId, fileId, update }, callback) => {
    const targetRoom = getRoom(socket, roomId);
    if (!targetRoom) {
      if (callback) callback({ error: "No room" });
      return;
    }

    const username = userSocketMap[socket.id];
    const perm = roomPermissions.get(targetRoom)?.get(username);
    
    // Authorization: Only owner or editor can write
    if (!perm || perm === "viewer") {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: "You have view-only access" });
      if (callback) callback({ error: "Permission denied" });
      return;
    }

    if (!update || update.length > MAX_UPDATE_SIZE) {
      if (callback) callback({ error: "Update too large or malformed" });
      return;
    }

    try {
      const updateBuf = Buffer.from(new Uint8Array(update));
      
      // Load doc and apply update (this validates it automatically)
      const entry = await getOrCreateServerDoc(fileId);
      Y.applyUpdate(entry.doc, updateBuf);

      // Persist valid update durably
      const updateId = crypto.randomUUID();
      await File.updateOne(
        { _id: fileId },
        { $push: { yjsUpdates: { id: updateId, update: updateBuf } } }
      );

      // Broadcast to other room members
      socket.to(targetRoom).emit(ACTIONS.YJS_UPDATE, { fileId, update });

      queueFlush(fileId);

      if (callback) callback({ success: true });
    } catch (err) {
      logger.error(`Error applying Yjs update: ${err.message}`);
      if (callback) callback({ error: err.message });
    }
  });

  // Awareness (cursors, presence)
  socket.on(ACTIONS.YJS_AWARENESS, ({ roomId, fileId, update }) => {
    const targetRoom = getRoom(socket, roomId);
    if (!targetRoom) return;

    socket.to(targetRoom).emit(ACTIONS.YJS_AWARENESS, { fileId, update });
  });

};

module.exports = { registerYjsHandlers, getOrCreateServerDoc };
