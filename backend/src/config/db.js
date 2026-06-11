'use strict';

const mongoose = require('mongoose');
const env = require('./env');

const RETRY_INTERVAL_MS = 5000;
const MAX_RETRIES = 5;

let retryCount = 0;

const connect = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      // Aparna: These options prevent connection pool exhaustion under load
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    retryCount = 0;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    retryCount += 1;
    console.error(`❌ MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}): ${err.message}`);

    if (retryCount >= MAX_RETRIES) {
      console.error('Max retries reached. Exiting.');
      process.exit(1);
    }

    console.log(`Retrying in ${RETRY_INTERVAL_MS / 1000}s...`);
    setTimeout(connect, RETRY_INTERVAL_MS);
  }
};

const disconnect = async () => {
  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
});

module.exports = { connect, disconnect };
