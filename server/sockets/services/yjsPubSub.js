const { redisClient, redisSubClient } = require("../../config/redis");
const logger = require("../../utils/logger");
const crypto = require("crypto");
const File = require("../../models/File");
const ACTIONS = require("../../Actions");

// Instance ID to identify origin
const INSTANCE_ID = crypto.randomUUID();

// Local map to prevent duplicate processing if we somehow receive our own event
const processedUpdates = new Set();
const MAX_PROCESSED_SIZE = 10000;

const YJS_CHANNEL_PREFIX = "yjs:updates:";
const AUTH_INVALIDATION_CHANNEL = "auth:invalidation";

const initYjsPubSub = (io, applyYjsUpdate, recoverCallback) => {
  redisSubClient.psubscribe(`${YJS_CHANNEL_PREFIX}*`, (err) => {
    if (err) logger.error(`Failed to subscribe to Yjs channels: ${err.message}`);
  });
  
  redisSubClient.subscribe(AUTH_INVALIDATION_CHANNEL, (err) => {
    if (err) logger.error(`Failed to subscribe to auth invalidation: ${err.message}`);
  });

  redisSubClient.on("pmessage", async (pattern, channel, message) => {
    if (pattern === `${YJS_CHANNEL_PREFIX}*`) {
      try {
        const payload = JSON.parse(message);
        const { originInstanceId, fileId, updateId, updateArray } = payload;
        
        if (originInstanceId === INSTANCE_ID) return; // Ignore our own updates
        if (processedUpdates.has(updateId)) return; // Already processed
        
        // Add to processed set
        processedUpdates.add(updateId);
        if (processedUpdates.size > MAX_PROCESSED_SIZE) {
          const firstItem = processedUpdates.values().next().value;
          processedUpdates.delete(firstItem);
        }

        const updateBuf = Buffer.from(new Uint8Array(updateArray));
        
        // Apply directly to memory without DB save (single-writer principle)
        await applyYjsUpdate(fileId, updateBuf, false);
      } catch (err) {
        logger.error(`Error processing Yjs pubsub message: ${err.message}`);
      }
    }
  });

  redisSubClient.on("message", (channel, message) => {
    if (channel === AUTH_INVALIDATION_CHANNEL) {
      try {
        const { roomId, username } = JSON.parse(message);
        // Force sockets of this user in this room to re-evaluate or disconnect
        // Handled dynamically by permissions cache invalidation, but we can emit a kick if needed
      } catch (err) {
        logger.error(`Error processing auth invalidation: ${err.message}`);
      }
    }
  });

  // Handle Reconnection & Recovery
  let isReconnecting = false;
  redisSubClient.on("reconnecting", () => {
    isReconnecting = true;
    logger.warn("Redis pubsub reconnecting... Yjs sync paused");
  });

  redisSubClient.on("connect", async () => {
    if (isReconnecting) {
      isReconnecting = false;
      logger.info("Redis pubsub reconnected! Initiating Yjs recovery...");
      if (recoverCallback) await recoverCallback();
    }
  });
};

const publishYjsUpdate = async (fileId, updateId, updateBuf) => {
  try {
    const channel = `${YJS_CHANNEL_PREFIX}${fileId}`;
    const payload = JSON.stringify({
      originInstanceId: INSTANCE_ID,
      fileId,
      updateId,
      updateArray: Array.from(updateBuf)
    });
    
    // Add to processed so we don't process it if it echoes back
    processedUpdates.add(updateId);
    
    await redisClient.publish(channel, payload);
  } catch (err) {
    logger.error(`Error publishing Yjs update: ${err.message}`);
  }
};

const publishAuthInvalidation = async (roomId, username) => {
  try {
    await redisClient.publish(AUTH_INVALIDATION_CHANNEL, JSON.stringify({ roomId, username }));
  } catch (err) {
    logger.error(`Error publishing auth invalidation: ${err.message}`);
  }
};

module.exports = {
  initYjsPubSub,
  publishYjsUpdate,
  publishAuthInvalidation,
  INSTANCE_ID
};
