const Y = require("yjs");
const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const File = require("../../models/File");
const { userSocketMap } = require("../roomState");
const { getPermission } = require("../services/permissionCache");
const { publishYjsUpdate, initYjsPubSub } = require("../services/yjsPubSub");

const MAX_UPDATE_SIZE = 100 * 1024; // 100KB per update
const FLUSH_INTERVAL_MS = 5000; // 5 seconds debounce

// Store active Yjs documents
// fileId -> { doc: Y.Doc, flushTimer: NodeJS.Timeout, isFlushing: boolean, updatesToFlush: Set<string> }
const serverYDocs = new Map();
let isPubSubInitialized = false;

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
    updatesToFlush: new Set()
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
          if (u.update) {
            try {
              Y.applyUpdate(doc, u.update);
            } catch (err) {
              logger.error(`Failed to apply Yjs update ${u.id}: ${err.message}`);
            }
          }
        });
      }
      // If no Yjs state exists yet but text content does (legacy migration)
      if (!file.yjsState && (!file.yjsUpdates || file.yjsUpdates.length === 0) && file.content) {
        const text = doc.getText("monaco");
        text.insert(0, file.content);
        queueFlush(fileId, []);
      }
    }
  } catch (err) {
    logger.error(`Error loading Yjs doc for file ${fileId}: ${err.message}`);
  }

  return entry;
};

// Expose recovery method to Pub/Sub
const recoverAllDocuments = async (io) => {
  logger.info(`Recovering ${serverYDocs.size} Yjs documents from MongoDB...`);
  for (const [fileId, entry] of serverYDocs.entries()) {
    try {
      const file = await File.findById(fileId);
      if (file) {
        const tempDoc = new Y.Doc();
        if (file.yjsState) Y.applyUpdate(tempDoc, file.yjsState);
        if (file.yjsUpdates) {
          file.yjsUpdates.forEach(u => {
            if (u.update) {
              try { Y.applyUpdate(tempDoc, u.update); } catch (e) {}
            }
          });
        }
        
        // Sync tempDoc with entry.doc
        const sv = Y.encodeStateVector(entry.doc);
        const missing = Y.encodeStateAsUpdate(tempDoc, sv);
        if (missing.length > 0) {
          Y.applyUpdate(entry.doc, missing);
          
          // Broadcast recovered updates to clients so they converge
          if (io && file.project) {
            io.to(file.project.toString()).emit(ACTIONS.YJS_UPDATE, { 
              fileId, 
              updateId: `recovery-${Date.now()}`, 
              update: Array.from(missing) 
            });
          }
        }
      }
    } catch (err) {
      logger.error(`Error recovering file ${fileId}: ${err.message}`);
    }
  }
};

const applyYjsUpdate = async (fileId, updateBuf, saveToDb = true, updateId = null) => {
  const entry = await getOrCreateServerDoc(fileId);
  Y.applyUpdate(entry.doc, updateBuf);

  if (saveToDb && updateId) {
    // True atomic idempotency: Only push if the specific updateId does not already exist
    const result = await File.updateOne(
      { _id: fileId, "yjsUpdates.id": { $ne: updateId } },
      { $push: { yjsUpdates: { id: updateId, update: updateBuf } } }
    );
    
    // Only if it actually inserted the update, do we track it for compaction
    if (result.modifiedCount > 0) {
      entry.updatesToFlush.add(updateId);
      queueFlush(fileId);
    }
  }
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

      // We only attempt to pull IDs that this local node successfully tracked
      const safeIdsToRemove = Array.from(entry.updatesToFlush);
      if (safeIdsToRemove.length === 0) return;

      const file = await File.findById(fileId).select('yjsUpdates compactionVersion');
      if (!file) return;

      const dbUpdateIds = new Set(file.yjsUpdates.map(u => u.id));
      const validIdsToRemove = safeIdsToRemove.filter(id => dbUpdateIds.has(id));

      if (validIdsToRemove.length > 0) {
        // Safe Distributed Compaction:
        // Must contain exactly the updates we plan to pull, AND version must match
        const result = await File.updateOne(
          { 
            _id: fileId, 
            compactionVersion: file.compactionVersion || 0,
            "yjsUpdates.id": { $all: validIdsToRemove }
          },
          { 
            $set: { yjsState: compactedState, content: newContent },
            $pull: { yjsUpdates: { id: { $in: validIdsToRemove } } },
            $inc: { compactionVersion: 1 }
          }
        );
        
        if (result.modifiedCount > 0) {
          // Success: DB successfully compacted. Clear from local flush queue.
          validIdsToRemove.forEach(id => entry.updatesToFlush.delete(id));
        } else {
          logger.warn(`Compaction collision for file ${fileId}, skipping this cycle.`);
        }
      } else {
        // IDs are already gone (compacted by someone else), remove locally
        safeIdsToRemove.forEach(id => entry.updatesToFlush.delete(id));
      }
      
    } catch (err) {
      logger.error(`Error flushing Yjs doc ${fileId}: ${err.message}`);
    } finally {
      entry.isFlushing = false;
    }
  }, FLUSH_INTERVAL_MS);
};

const registerYjsHandlers = (io, socket) => {
  if (!isPubSubInitialized) {
    initYjsPubSub(io, applyYjsUpdate, () => recoverAllDocuments(io));
    isPubSubInitialized = true;
  }

  socket.on(ACTIONS.YJS_SYNC_STEP_1, async ({ roomId, fileId }, callback) => {
    const targetRoom = getRoom(socket, roomId);
    if (!targetRoom) {
      if (callback) callback({ error: "No room" });
      return;
    }
    
    const username = userSocketMap[socket.id];
    const perm = await getPermission(targetRoom, username);
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

  socket.on(ACTIONS.YJS_SYNC_STEP_2, async ({ roomId, fileId, sv }, callback) => {
    const targetRoom = getRoom(socket, roomId);
    if (!targetRoom) {
      if (callback) callback({ error: "No room" });
      return;
    }

    const username = userSocketMap[socket.id];
    const perm = await getPermission(targetRoom, username);
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

  socket.on(ACTIONS.YJS_UPDATE, async ({ roomId, fileId, updateId, update }, callback) => {
    const targetRoom = getRoom(socket, roomId);
    if (!targetRoom) {
      if (callback) callback({ error: "No room" });
      return;
    }

    const username = userSocketMap[socket.id];
    const perm = await getPermission(targetRoom, username);
    
    if (!perm || perm === "viewer") {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: "You have view-only access" });
      if (callback) callback({ error: "Permission denied" });
      return;
    }

    if (!update || update.length > MAX_UPDATE_SIZE || !updateId) {
      if (callback) callback({ error: "Update malformed or missing updateId" });
      return;
    }

    try {
      const updateBuf = Buffer.from(new Uint8Array(update));
      
      // Apply and save to DB
      await applyYjsUpdate(fileId, updateBuf, true, updateId);

      // Publish to other nodes
      await publishYjsUpdate(fileId, updateId, updateBuf);

      // Broadcast to local connected clients in the room (Redis adapter propagates this)
      socket.to(targetRoom).emit(ACTIONS.YJS_UPDATE, { fileId, updateId, update });

      if (callback) callback({ success: true });
    } catch (err) {
      logger.error(`Error applying Yjs update: ${err.message}`);
      if (callback) callback({ error: err.message });
    }
  });

  socket.on(ACTIONS.YJS_AWARENESS, ({ roomId, fileId, update }) => {
    const targetRoom = getRoom(socket, roomId);
    if (!targetRoom) return;

    socket.to(targetRoom).emit(ACTIONS.YJS_AWARENESS, { fileId, update });
  });

};

module.exports = { registerYjsHandlers, getOrCreateServerDoc, queueFlush };
