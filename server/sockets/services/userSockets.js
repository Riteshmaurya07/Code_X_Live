const { redisClient } = require("../../config/redis");
const logger = require("../../utils/logger");

const SOCKET_TTL = 86400; // 24 hours

const addUserSocket = async (userId, socketId) => {
  try {
    if (!userId || !socketId) return;
    const key = `user:${userId}:sockets`;
    await redisClient.sadd(key, socketId);
    await redisClient.expire(key, SOCKET_TTL);
  } catch (err) {
    logger.error(`Redis error addUserSocket: ${err.message}`);
  }
};

const removeUserSocket = async (userId, socketId) => {
  try {
    if (!userId || !socketId) return;
    const key = `user:${userId}:sockets`;
    await redisClient.srem(key, socketId);
  } catch (err) {
    logger.error(`Redis error removeUserSocket: ${err.message}`);
  }
};

const getUserSockets = async (userId) => {
  try {
    if (!userId) return [];
    const key = `user:${userId}:sockets`;
    return await redisClient.smembers(key);
  } catch (err) {
    logger.error(`Redis error getUserSockets: ${err.message}`);
    return [];
  }
};

module.exports = {
  addUserSocket,
  removeUserSocket,
  getUserSockets,
};
