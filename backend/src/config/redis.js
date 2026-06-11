'use strict';

const Redis = require('ioredis');
const env = require('./env');

// Aparna: Singleton pattern — one client shared across the entire app.
// ioredis handles connection pooling and auto-reconnect internally.
let redisClient = null;

const getClient = () => {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) => console.error(`❌ Redis error: ${err.message}`));
    redisClient.on('reconnecting', () => console.warn('⚠️  Redis reconnecting...'));
  }

  return redisClient;
};

const disconnect = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis disconnected.');
  }
};

/**
 * Cache-aside helpers — keeps caching logic out of service files.
 * Services call these directly rather than importing ioredis.
 */
const cache = {
  get: async (key) => {
    const value = await getClient().get(key);
    return value ? JSON.parse(value) : null;
  },

  set: async (key, value, ttlSeconds = env.REDIS_CACHE_TTL) => {
    await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },

  del: async (...keys) => {
    if (keys.length > 0) await getClient().del(...keys);
  },

  // Delete all keys matching a pattern — used for bulk cache invalidation
  delByPattern: async (pattern) => {
    const keys = await getClient().keys(pattern);
    if (keys.length > 0) await getClient().del(...keys);
  },
};

module.exports = { getClient, disconnect, cache };
