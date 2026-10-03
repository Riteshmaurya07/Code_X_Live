const Redis = require('ioredis');
const logger = require('../utils/logger');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Main redis client for normal commands
const redisClient = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Pub/sub client for subscribing
const redisSubClient = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('error', (err) => logger.error(`Redis client error: ${err.message}`));
redisSubClient.on('error', (err) => logger.error(`Redis sub client error: ${err.message}`));

redisClient.on('connect', () => logger.info('Redis client connected'));
redisSubClient.on('connect', () => logger.info('Redis sub client connected'));

module.exports = {
  redisClient,
  redisSubClient,
};
