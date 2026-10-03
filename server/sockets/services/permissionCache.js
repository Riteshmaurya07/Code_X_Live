const { redisClient } = require("../../config/redis");
const Project = require("../../models/Project");
const User = require("../../models/User");
const logger = require("../../utils/logger");

const CACHE_KEY = "CODE_X_PERMISSIONS";
const PERM_TTL = 3600; // 1 hour

// Flush cache on reconnect to avoid stale permissions after network splits
redisClient.on("connect", async () => {
  try {
    await redisClient.del(CACHE_KEY);
    logger.info("Cleared Redis permission cache on reconnect to prevent stale data.");
  } catch (err) {
    logger.error("Failed to clear permission cache on reconnect");
  }
});

// Helper to determine role from DB
const fetchRoleFromDB = async (roomId, username) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return null;
    
    let project;
    if (typeof roomId === "string" && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(roomId);
    }
    if (!project) project = await Project.findOne({ roomId });
    if (!project) project = await Project.findOne({ shareToken: roomId });

    if (!project) return null;

    if (project.owner.toString() === user._id.toString()) {
      return "editor";
    }
    const collab = project.collaborators.find(
      (c) => c.user && c.user.toString() === user._id.toString()
    );
    if (collab) {
      return collab.role;
    }
    return "viewer";
  } catch (err) {
    logger.error(`Error fetching role from DB: ${err.message}`);
    return null;
  }
};

const getPermission = async (roomId, username) => {
  try {
    const field = `${roomId}:${username}`;
    const cachedRole = await redisClient.hget(CACHE_KEY, field);
    if (cachedRole) {
      return cachedRole;
    }
    
    // Cache miss, fallback to DB
    const dbRole = await fetchRoleFromDB(roomId, username);
    if (dbRole) {
      await redisClient.hset(CACHE_KEY, field, dbRole);
      // We can't set TTL on a single hash field easily in basic Redis without extra commands, 
      // but we can set TTL on the whole hash if it doesn't have one, or just rely on reconnect flush and explicit invalidation.
      return dbRole;
    }
    
    return null;
  } catch (err) {
    logger.error(`Redis error getting permission: ${err.message}`);
    // Fail closed on Redis error
    return null; 
  }
};

const setPermission = async (roomId, username, role) => {
  try {
    const field = `${roomId}:${username}`;
    await redisClient.hset(CACHE_KEY, field, role);
  } catch (err) {
    logger.error(`Redis error setting permission: ${err.message}`);
  }
};

const removePermission = async (roomId, username) => {
  try {
    const field = `${roomId}:${username}`;
    await redisClient.hdel(CACHE_KEY, field);
  } catch (err) {
    logger.error(`Redis error removing permission: ${err.message}`);
  }
};

module.exports = {
  getPermission,
  setPermission,
  removePermission,
  fetchRoleFromDB
};
