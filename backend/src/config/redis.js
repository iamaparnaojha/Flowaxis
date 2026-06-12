'use strict';

const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;
let redisAvailable = false;

/**
 * Aparna: Redis is an optional cache layer, not a hard dependency.
 * If REDIS_URL is not configured or Redis is unreachable, the app runs
 * normally — every cache operation becomes a no-op. This prevents a
 * Redis outage from taking down the API server.
 */
const getClient = () => {
  if (!env.REDIS_URL) return null;

  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      // Aparna: null = retry forever (default) would block requests.
      // 0 = no retries — fail immediately and let the no-op fallback take over.
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 3000,
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      // Only log once per connection attempt — not on every retry
      if (redisAvailable) {
        console.error(`❌ Redis error: ${err.message}`);
      }
      redisAvailable = false;
    });

    redisClient.on('reconnecting', () => {
      console.warn('⚠️  Redis reconnecting...');
    });

    // Attempt connection but don't block startup
    redisClient.connect().catch(() => {
      redisAvailable = false;
    });
  }

  return redisAvailable ? redisClient : null;
};

const disconnect = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      // ignore errors during shutdown
    }
    redisClient = null;
    redisAvailable = false;
    console.log('Redis disconnected.');
  }
};

/**
 * Cache-aside helpers — all methods silently no-op when Redis is unavailable.
 * Services never need to handle Redis errors themselves.
 */
const cache = {
  get: async (key) => {
    const client = getClient();
    if (!client) return null;
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null; // Cache miss — serve from DB
    }
  },

  set: async (key, value, ttlSeconds = env.REDIS_CACHE_TTL) => {
    const client = getClient();
    if (!client) return;
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Non-fatal — data will be fetched from DB next time
    }
  },

  del: async (...keys) => {
    const client = getClient();
    if (!client || keys.length === 0) return;
    try {
      await client.del(...keys);
    } catch {
      // Non-fatal
    }
  },

  delByPattern: async (pattern) => {
    const client = getClient();
    if (!client) return;
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) await client.del(...keys);
    } catch {
      // Non-fatal
    }
  },
};

module.exports = { getClient, disconnect, cache };
