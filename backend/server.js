'use strict';

// Aparna: env.js is the very first import — it validates all environment
// variables and exits cleanly if anything is missing or malformed.
const env = require('./src/config/env');
const app = require('./app');
const { connect: connectDB, disconnect: disconnectDB } = require('./src/db/connection');
const { disconnect: disconnectRedis } = require('./src/config/redis');

const bootstrap = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`\n🚀 FlowAxis API running on port ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`   API     → http://localhost:${env.PORT}/api/v1`);
    console.log(`   Docs    → http://localhost:${env.PORT}/api/v1/docs`);
    console.log(`   Health  → http://localhost:${env.PORT}/health\n`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n[${signal}] Graceful shutdown initiated...`);
    server.close(async () => {
      await disconnectDB();
      await disconnectRedis();
      console.log('All connections closed. Goodbye.\n');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Surface unhandled rejections — never silently swallow async errors
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
};

bootstrap();
